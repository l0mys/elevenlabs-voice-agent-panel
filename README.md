# ElevenLabs Sesli Agent Paneli

Arayüz `index.html` olarak sunulur. ElevenLabs API anahtarı tarayıcıya verilmez; sunucu, doğrulanmış kullanıcılar için kısa ömürlü signed URL üretir.

## Backend kurulumu

Bu örnek mevcut, oturum doğrulaması olan bir Express uygulamasına eklenmek üzere hazırlanmıştır; tek başına internete açık bir proxy olarak çalıştırmayın.

1. Node.js 18+ ve mevcut Express uygulamanızda bağımlılıkları kurun:

   ```bash
   npm install express-rate-limit
   ```

2. Sunucuda ortam değişkenlerini ayarlayın (API key'i HTML, GitHub veya frontend ortam değişkenlerine koymayın):

   ```text
   ELEVENLABS_API_KEY=xi-...
   ELEVENLABS_AGENT_ID=your-agent-id
   PUBLIC_APP_ORIGIN=https://your-domain.example
   ```

3. Router'ı uygulamanızda, JSON body parser ve gerçek kimlik doğrulama middleware'inizle birlikte mount edin:

   ```js
   import express from "express";
   import { createElevenLabsRouter } from "./server/elevenlabs-router.js";
   import { requireAuth } from "./your-auth.js";

   const app = express();
   app.use(express.json({ limit: "10kb" }));
   app.use("/api/elevenlabs", createElevenLabsRouter({ requireAuth }));
   ```

   `requireAuth`-ın anonim isteklere `401` vermesi gerekir. Kimlik doğrulama olmadan endpoint'i yayınlamayın. `express-rate-limit` ek bir sınırdır, kimlik doğrulamanın yerine geçmez.

4. `index.html`-i aynı origin'den HTTPS ile sunun. Arayüzde girilen Agent ID, `ELEVENLABS_AGENT_ID` ile aynı olmalıdır. Backend farklı agent ID seçimine izin vermez.

Endpoint `POST /api/elevenlabs/signed-url` adresinde `{ "agentId": "..." }` bekler ve `{ "signedUrl": "wss://..." }` döndürür. Bu, `index.html` içindeki endpoint ve yanıt biçimiyle uyumludur.

## Güvenlik notları

- API key'i yalnızca sunucu tarafında gizli ortam değişkeni/secret manager içinde saklayın. Key'i commit ettiyseniz ElevenLabs panelinden iptal edip yenileyin.
- Örnekteki `requireAuth` yer tutucusunu kendi uygulamanızın gerçek kullanıcı/oturum denetimiyle değiştirin.
- `PUBLIC_APP_ORIGIN` değerini tam origin olarak ayarlayın (ör. `https://voice.example.com`; sonunda `/` olmamalı). Origin kontrolü tek başına kimlik doğrulama değildir.
- `index.html` içindeki ElevenLabs istemci SDK'sını canlı kullanımda paketleyip sürümünü sabitleyin; güvenlik başlıkları ve HTTPS de kullanın.
- GitHub Pages yalnızca statik HTML'i sunar; bu özel API endpoint'ini çalıştıramaz. Backend'i HTTPS destekleyen bir sunucuya deploy edin ve gerekirse frontend'deki endpoint'i aynı origin'e yönlendiren reverse proxy kullanın.
