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
    ? "Increase the late-1980s styling moderately with somewhat brighter laser accents and a little more studio glow, but keep the portrait realistic and believable. Do not exaggerate the clothing, hair, makeup, or shoulder pads."
    : intensity === "subtle"
    ? "Keep the late-1980s styling understated with faint laser lines, minimal haze, natural clothing proportions, and a smaller softer secondary portrait."
    : "Create an authentic, tasteful, realistic late-1980s school-photo studio portrait that looks genuinely photographed rather than like a modern retro parody.";

const prompt = `
Create a highly realistic professional late-1980s school portrait using BOTH uploaded photos of the SAME person.

IMAGE 1 is the PRIMARY portrait reference.
Use IMAGE 1 to preserve the person's identity as accurately as possible, including facial structure, apparent age, skin tone, eye color, hair color, hairstyle, smile, and natural facial proportions.

IMAGE 2 is the SECONDARY expression reference.
Use IMAGE 2 only for the faded double-exposure portrait in the ${cornerPosition}. Preserve the same person's identity and use the expression from IMAGE 2.

The finished photograph should look like a genuine school, department-store, or portrait-studio photograph taken around 1987-1989.

It should feel nostalgic and period-correct, but NOT exaggerated, comedic, costume-like, or like a modern parody of the 1980s.

Main portrait:
- ${blazerColor} late-1980s blazer
- realistic fit and proportions
- mild to moderate shoulder padding appropriate to the period
- do not make the shoulder pads oversized or cartoonish
- simple light-colored top underneath
- natural school-photo pose
- age-appropriate styling
- realistic skin texture
- natural facial detail
- realistic hair texture
- realistic eyes and teeth
- preserve recognizable facial features from IMAGE 1
- do not make the subject look older or younger

Lighting:
- authentic professional portrait-studio lighting
- soft key light on the face
- gentle fill light
- natural shadows
- believable eye catchlights
- subtle vintage photographic softness
- slight film-like softness rather than digital blur
- avoid plastic skin
- avoid excessive airbrushing
- avoid excessive glamour retouching

Background:
- authentic dark navy, indigo, and muted purple studio backdrop
- several thin diagonal electric-blue and hot-pink laser streaks
- laser lines should appear behind the subject
- lasers should be clearly visible but should not dominate the photograph
- subtle atmospheric studio haze
- restrained vintage photo-lab glow
- no futuristic sci-fi appearance
- no modern neon nightclub appearance

Secondary portrait:
- place a faded head-and-shoulders portrait in the ${cornerPosition}
- use IMAGE 2 for the expression
- make it noticeably smaller and softer than the main portrait
- semi-transparent double-exposure appearance
- softly feathered edges that blend naturally into the background
- subtle opacity
- dreamy photographic effect
- keep the main portrait visually dominant

Composition:
- square portrait
- professionally composed
- authentic late-1980s school photography
- realistic camera perspective
- realistic photographic depth
- photorealistic rather than illustrated
- no text
- no logos
- no watermark
- no caricature
- no exaggerated makeup
- no exaggerated shoulder pads
- no costume appearance
- no comedy or parody styling

Most importantly, prioritize preservation of the person's recognizable identity over stylization.

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
