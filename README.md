# Retro Laser Portrait — Vercel v3

This version deliberately removes the OpenAI Node SDK and every npm runtime dependency from the serverless function.

The backend uses only native Node/Vercel features:
- `fetch`
- `FormData`
- `Blob`
- `Buffer`

This avoids package/import initialization failures inside the Vercel function.

## Deploy

Replace the old files in the SAME GitHub repository with the contents of this ZIP and commit.

Vercel should automatically redeploy.

## Environment variable

Vercel → Project → Settings → Environment Variables

Confirm:

`OPENAI_API_KEY`

is set for Production.

## Test the backend BEFORE generating

After deployment, open:

`https://YOUR-SITE.vercel.app/api/health`

You should see JSON similar to:

`{"ok":true,"apiKeyConfigured":true,"runtime":"v22..."}`

If `apiKeyConfigured` is false, the code is fine and the Vercel environment variable needs to be fixed.

If `/api/health` itself shows FUNCTION_INVOCATION_FAILED, send a screenshot of the Vercel Runtime Log for that invocation.

## Vercel logs

Vercel → your project → Observability / Logs → Functions

Open the failed `/api/generate` invocation and copy or screenshot the first red error line. That line reveals the exact remaining problem.
