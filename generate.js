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

    const portraitStyle = String(body.portraitStyle || "laser").slice(0, 40);
    const blazerColor = String(body.blazerColor || "dusty pink").slice(0, 50);
    const hairstyle = String(body.hairstyle || "natural").slice(0, 60);
    const cornerPosition = String(body.cornerPosition || "upper left").slice(0, 30);
    const intensity = String(body.intensity || "classic").slice(0, 20);

    const blazerNotes =
      blazerColor === "no blazer"
        ? "Do not add a blazer. Dress the subject in a simple period-appropriate late-1980s top, blouse, collared shirt, or knit shirt instead."
        : `Dress the subject in a ${blazerColor} late-1980s blazer with realistic proportions and only mild to moderate shoulder padding. Do not make it cartoonish or oversized.`;

    const hairstyleNotes =
      hairstyle === "natural"
        ? "Do not change the hairstyle. Keep the person's natural hairstyle close to the uploaded photo."
        : `Give the subject a realistic late-1980s ${hairstyle} hairstyle. Adapt the style naturally to the person rather than forcing an exact gendered look. Preserve hair color, hairline, overall face shape, and recognizable identity. Keep the result believable and period-correct, not costume-like.`;

    const stylePreset =
      portraitStyle === "brown_studio"
        ? `Use a warm brown, sepia, amber, and dark espresso-toned retro studio aesthetic. The background should be dark brown to nearly black with subtle vignette and soft studio depth. Do not include neon lasers. Use soft dramatic studio lighting, a believable department-store portrait look, and a nostalgic late-1970s to late-1980s photographic mood. The secondary portrait should be a much larger softly faded floating face in the ${cornerPosition}, closer to a moody retro studio composite.`
        : `Use the classic late-1980s laser portrait look with a deep navy, indigo, and purple backdrop, electric-blue and hot-pink diagonal laser beams behind the subject, subtle haze, and soft vintage photo-lab glow. The secondary portrait should be a faded double-exposure portrait in the ${cornerPosition}.`;

    const intensityNotes =
      portraitStyle === "brown_studio"
        ? (intensity === "extra"
            ? "Push the brown-studio mood more strongly with richer sepia toning, a slightly larger faded background face, stronger vignette, and a little more dramatic studio lighting, while staying photorealistic."
            : intensity === "subtle"
            ? "Keep the brown-studio effect understated with cleaner lighting, softer sepia toning, and a more restrained faded background face."
            : "Use a balanced warm studio treatment with natural sepia warmth and a clear but tasteful faded background face.")
        : (intensity === "extra"
            ? "Push the late-1980s laser glamour moderately with brighter neon lasers, stronger soft-focus glow, and richer blue-purple haze, while still keeping the portrait believable and photorealistic."
            : intensity === "subtle"
            ? "Keep the late-1980s laser styling subtle with restrained lasers, gentle soft-focus, modest styling, and a smaller softer secondary portrait."
            : "Use a classic, authentic, unmistakable late-1980s laser studio aesthetic that feels real rather than parody-like.");

    const prompt = `
Create a polished photorealistic retro portrait composite using BOTH uploaded photos of the SAME person.

IMAGE 1 is the primary portrait reference. Preserve identity, facial structure, age, skin tone, eye color, and recognizable hair.
IMAGE 2 is the secondary expression reference. Use it for the faded background portrait.

Main portrait:
- ${blazerNotes}
- ${hairstyleNotes}
- age-appropriate styling
- professional retro studio pose
- natural skin texture
- realistic eyes, teeth, and facial detail
- the person should clearly look like the same person from the uploads
- no text or logos

Style treatment:
- ${stylePreset}
- ${intensityNotes}

Background and secondary portrait:
- use image 2 for the faded secondary portrait
- semi-transparent with feathered edges
- the secondary portrait should not overpower the main portrait
- if using the brown studio style, make the secondary portrait larger and more like a softly faded floating face in the background
- if using the laser style, keep the double-exposure portrait more clearly separated from the main portrait

Composition:
- square
- photorealistic
- keep the main portrait dominant
- do not age the person up or down
- no watermarks
- no parody styling
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
