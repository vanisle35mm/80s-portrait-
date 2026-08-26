# Retro Laser Portrait — iPhone/PWA Edition

This version is set up as an **installable web app for iPhone**.

## What you get

- Two-photo upload
- Main portrait + faded corner-expression portrait
- Pink/blue laser background
- 80s blazer choices
- Adjustable 80s intensity
- iPhone Share Sheet support for saving/sharing the generated portrait
- Home Screen installation with an app icon
- Full-screen standalone appearance when launched from the Home Screen

## The easiest way to put it on your iPhone

The app needs to be hosted on an HTTPS website because the image generation happens on a server and your OpenAI API key must stay private.

### Option: Render

1. Put this folder in a GitHub repository.
2. In Render, create a new **Web Service** from that repository.
3. Render will read `render.yaml`.
4. Add the environment variable:
   `OPENAI_API_KEY = your OpenAI API key`
5. Deploy.
6. Open the resulting HTTPS address in **Safari on your iPhone**.
7. Tap **Share** → **Add to Home Screen** → **Add**.

After that it launches from your iPhone Home Screen much like a normal app.

## Local development

```bash
npm install
cp .env.example .env
```

Add your key to `.env` and run:

```bash
npm start
```

Then open `http://localhost:3000`.

## Native iPhone app?

This PWA version does not require the App Store. If you later want a true native iOS app distributed through TestFlight/App Store, the same concept can be rebuilt in SwiftUI with a small secure backend for the OpenAI API key.
