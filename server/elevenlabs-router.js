import express from "express";
import rateLimit from "express-rate-limit";

/**
 * Mount this router inside your existing authenticated Express application.
 * `requireAuth` must reject anonymous requests using your app's real session/auth system.
 */
export function createElevenLabsRouter({ requireAuth }) {
  if (typeof requireAuth !== "function") {
    throw new TypeError("Pass your application's requireAuth middleware.");
  }

  const { ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, PUBLIC_APP_ORIGIN } = process.env;
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !PUBLIC_APP_ORIGIN) {
    throw new Error("ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID and PUBLIC_APP_ORIGIN are required.");
  }

  const router = express.Router();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." }
  });

  router.post("/signed-url", requireAuth, limiter, async (req, res) => {
    // Same-origin check is defense in depth; it is not a replacement for authentication.
    if (req.get("origin") !== PUBLIC_APP_ORIGIN) {
      return res.status(403).json({ error: "Request origin not allowed." });
    }

    if (!req.is("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json." });
    }

    // Only the server-configured agent is allowed. Never use a caller-provided ID
    // to select arbitrary agents on an account.
    if (req.body?.agentId !== ELEVENLABS_AGENT_ID) {
      return res.status(400).json({ error: "Unknown agent." });
    }

    try {
      const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
      url.searchParams.set("agent_id", ELEVENLABS_AGENT_ID);

      const upstream = await fetch(url, {
        method: "GET",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        signal: AbortSignal.timeout(10_000)
      });

      if (!upstream.ok) {
        // Do not return upstream response details or credentials to the browser.
        console.error("ElevenLabs signed URL request failed with status", upstream.status);
        return res.status(502).json({ error: "Could not create a voice session." });
      }

      const data = await upstream.json();
      if (typeof data.signed_url !== "string" || !data.signed_url.startsWith("wss://")) {
        console.error("ElevenLabs returned an invalid signed URL response.");
        return res.status(502).json({ error: "Could not create a voice session." });
      }

      res.set("Cache-Control", "no-store");
      return res.json({ signedUrl: data.signed_url });
    } catch (error) {
      console.error("Signed URL request error:", error instanceof Error ? error.message : "unknown error");
      return res.status(502).json({ error: "Could not create a voice session." });
    }
  });

  return router;
}
