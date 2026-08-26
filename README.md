# Retro Laser Portrait — Vercel FIXED edition

This version removes the multipart upload parser that could crash inside the Vercel Function.

It now:
- resizes both iPhone photos in the browser before upload
- sends compact JSON to `/api/generate`
- keeps each photo below Vercel's serverless request-size ceiling
- asks the image API for compressed JPEG output so the generated image also stays below Vercel's response-size ceiling
- keeps `OPENAI_API_KEY` server-side
- uses a fresh/network-first service worker so an older broken `app.js` is less likely to remain cached

## Replace the old GitHub files

Upload the CONTENTS of this folder to the root of the same GitHub repository and overwrite the old files.

Important changed files:
- `api/generate.js`
- `app.js`
- `package.json`
- `vercel.json`
- `sw.js`

Then commit the changes.

Vercel should automatically create a new deployment from the GitHub commit.

## Check the API key

In Vercel:
Project → Settings → Environment Variables

Make sure this exists:

`OPENAI_API_KEY`

It must be enabled for Production.

After changing an environment variable, redeploy.

## On iPhone after redeploying

Open the newest Vercel deployment URL in Safari.

If you had already added the old version to your Home Screen, remove that icon and add it again after the fixed deployment is live.

If Safari still shows the old version, open the new deployment URL once in a Private tab or clear website data for the Vercel site.
