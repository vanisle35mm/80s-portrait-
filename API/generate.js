function dataUrlToBlob(dataUrl, label) {
  if (typeof dataUrl !== "string") throw new Error(`${label} is missing.`);
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error(`${label} is not a supported image.`);
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 1700000) {
    const err = new Error(`${label} is too large after compression.`);
    err.statusCode = 413;
    throw err;
  }
  return new Blob([bytes], { type: match[1] });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing in Vercel." });
    }

    const body = req.body || {};
    const main = dataUrlToBlob(body.mainPhoto, "Main photo");
    const corner = dataUrlToBlob(body.cornerPhoto, "Corner photo");

    const blazerColor = String(body.blazerColor || "dusty pink").slice(0, 50);
    const cornerPosition = String(body.cornerPosition || "upper left");
    const intensity = String(body.intensity || "classic");

    const styleNotes =
      intensity === "extra"
        ? "Push the late-1980s glamour strongly: more neon lasers, stronger soft-focus glow, bigger shoulder pads, richer blue-purple haze."
        : intensity === "subtle"
        ? "Keep the late-1980s styling relatively subtle: restrained lasers, gentle soft-focus, modest shoulder pads."
        : "Use a classic unmistakable late-1980s school-photo studio aesthetic.";

    const prompt = `
Create a polished photorealistic late-1980s school-portrait composite using BOTH uploaded photos of the SAME person.

IMAGE 1 is the primary portrait reference. Preserve identity, facial structure, age, skin tone, eye color, and recognizable hair.
IMAGE 2 is the secondary expression reference. Use it as a large dreamy translucent double-exposure portrait in the ${cornerPosition}.

Main portrait:
- ${blazerColor} oversized late-1980s blazer with padded shoulders
- simple light top
- age-appropriate natural styling
- professional school portrait pose
- no text or logos

Background:
- deep navy / indigo / purple studio backdrop
- electric-blue and hot-pink diagonal laser beams
- haze, airbrushed glow, vintage photo-lab softness

Secondary portrait:
- large faded head-and-shoulders image in the ${cornerPosition}
- semi-transparent, feathered edges
- expression from image 2

Composition:
- square
- photorealistic
- do not age the person up or down

${styleNotes}
`;

    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("prompt", prompt);
    form.append("image[]", main, "main.jpg");
    form.append("image[]", corner, "corner.jpg");
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("output_format", "jpeg");
    form.append("output_compression", "72");

    const upstream = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });

    const result = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: result?.error?.message || `OpenAI request failed (${upstream.status}).`
      });
    }

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) return res.status(502).json({ error: "No image data returned." });

    return res.status(200).json({ image: `data:image/jpeg;base64,${b64}` });
  } catch (error) {
    console.error(error);
    return res.status(error?.statusCode || 500).json({
      error: error?.message || "Generation failed."
    });
  }
}
