# Retro Laser Portrait — Vercel Edition

This package is ready for **GitHub → Vercel** and is designed to work on iPhone.

## Files to upload to GitHub

Upload the contents of this folder directly into the root of your GitHub repository:

- `index.html`
- `style.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- icons
- `api/generate.js`
- `package.json`
- `vercel.json`

Do not upload a `.env` file or your OpenAI API key.

## Deploy on Vercel

1. Sign in to Vercel.
2. Tap **Add New → Project**.
3. Import the GitHub repository containing these files.
4. Vercel should detect it as an **Other** project. No build command is required.
5. Before deploying, add an Environment Variable:
   - Name: `OPENAI_API_KEY`
   - Value: your OpenAI API key
6. Deploy.

When Vercel finishes, it will give you an HTTPS web address.

## Put it on your iPhone Home Screen

1. Open the Vercel web address in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

The app can then launch from the Home Screen.

## How it works

- Main photo: primary portrait reference
- Corner photo: faded expression reference
- OpenAI image generation creates the blazer, laser background, studio lighting, and double-exposure corner image
- The OpenAI API key remains on Vercel's server side and is not exposed to the browser
