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
    const hairstyle = String(body.hairstyle || "natural").slice(0, 50);
    const cornerPosition = String(body.cornerPosition || "upper left");
    const intensity = String(body.intensity || "classic");

    const blazerNotes =
      blazerColor === "no blazer"
        ? "Do not add a blazer. Dress the subject in a simple period-appropriate late-1980s top or blouse instead."
        : `Dress the subject in a ${blazerColor} late-1980s blazer with realistic proportions and only mild to moderate shoulder padding. Do not make it cartoonish or oversized.`;

    const hairstyleNotes =
      hairstyle === "natural"
        ? "Do not change the hairstyle. Keep the person's natural hairstyle close to the uploaded photo."
        : `Give the subject a realistic late-1980s ${hairstyle} hairstyle. Adapt the style naturally to the person rather than forcing an exact gendered look. Preserve hair color, hairline, overall face shape, and recognizable identity. Keep the result believable and period-correct, not costume-like.`;

    const styleNotes =
      intensity === "extra"
        ? "Push the late-1980s glamour moderately with brighter neon lasers, stronger soft-focus glow, and richer blue-purple haze, while still keeping the portrait believable and photorealistic."
        : intensity === "subtle"
        ? "Keep the late-1980s styling subtle with restrained lasers, gentle soft-focus, modest styling, and a smaller softer secondary portrait."
        : "Use a classic, authentic, unmistakable late-1980s school-photo studio aesthetic that feels real rather than parody-like.";

    const prompt = `
Create a polished photorealistic late-1980s school-portrait composite using BOTH uploaded photos of the SAME person.

IMAGE 1 is the primary portrait reference. Preserve identity, facial structure, age, skin tone, eye color, and recognizable hair.
IMAGE 2 is the secondary expression reference. Use it as a dreamy translucent double-exposure portrait in the ${cornerPosition}.

Main portrait:
- ${blazerNotes}
- ${hairstyleNotes}
- simple light top if no blazer is used
- age-appropriate natural styling
- professional school portrait pose
- natural skin texture
- realistic eyes, teeth, and facial detail
- no text or logos

Background:
- deep navy / indigo / purple studio backdrop
- electric-blue and hot-pink diagonal laser beams
- haze, soft glow, and vintage photo-lab softness
- lasers should support the portrait and not overpower it

Secondary portrait:
- faded head-and-shoulders image in the ${cornerPosition}
- semi-transparent with feathered edges
- smaller and softer than the main portrait
- expression from image 2

Composition:
- square
- photorealistic
- keep the main portrait dominant
- do not age the person up or down
- no watermarks

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
