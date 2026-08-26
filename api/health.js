export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    runtime: process.version
  });
}
