export const maxDuration = 300;

function imageBlob(dataUrl, label) {
  if (typeof dataUrl !== "string") {
    throw new Error(`${label} missing`);
  }

  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/
  );

  if (!match) {
    throw new Error(`${label} invalid`);
  }

  const bytes = Buffer.from(match[2], "base64");

  if (bytes.length > 1700000) {
    throw new Error(`${label} too large`);
  }

  return new Blob([bytes], { type: match[1] });
}

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY is missing in Vercel." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const main = imageBlob(body.mainPhoto, "Main photo");
    const corner = imageBlob(body.cornerPhoto, "Corner photo");

    const blazer = String(
      body.blazerColor || "dusty pink"
    ).slice(0, 40);

    const position = String(
      body.cornerPosition || "upper left"
    );

    const level = String(
      body.intensity || "classic"
    );

    const intensityNotes =
      level === "extra"
        ? "Increase the 1980s styling moderately: slightly brighter laser accents, a little more studio glow, and slightly stronger period styling, while keeping the result believable and photorealistic."
        : level === "subtle"
        ? "Keep the 1980s styling understated: very faint laser lines, minimal shoulder padding, very little haze, and a smaller secondary portrait."
        : "Use an authentic, tasteful, believable late-1980s school-portrait aesthetic.";

    const prompt = `
Create a photorealistic late-1980s school portrait using BOTH uploaded photos of the SAME person.

PHOTO 1 is the main portrait reference.
PHOTO 2 is the expression reference for the faded secondary portrait.

Preserve the person's identity extremely closely. Maintain the same facial structure, apparent age, skin tone, eye color, hairstyle, hair color, smile, and natural facial proportions.

The finished subject should clearly look like the same person in the reference photos.

The final photograph should look like a genuine professionally photographed school or department-store studio portrait from approximately 1987-1989.

It should feel authentic and nostalgic, not like a modern parody of the 1980s.

MAIN PORTRAIT:
- natural and believable school-photo pose
- ${blazer} period-correct 1980s blazer
- moderate realistic shoulder padding
- blazer should fit naturally and not look like a costume
- simple light-colored shirt or blouse underneath
- realistic natural skin texture
- realistic eyes, teeth, hair, and facial details
- restrained period-appropriate styling
- do not make the subject appear older or younger

LIGHTING:
- realistic soft studio key lighting
- gentle fill light
- natural shadows around the face and clothing
- believable eye catchlights
- subtle vintage photographic softness
- avoid plastic-looking skin
- avoid excessive airbrushing
- avoid excessive artificial glow

BACKGROUND:
- authentic dark navy, indigo, and muted purple studio backdrop
- a small number of soft hot-pink and electric-blue diagonal laser streaks
- laser beams remain behind the subject
- lasers should support the portrait rather than dominate it
- subtle atmospheric studio haze
- restrained late-1980s photo-lab glow
- no futuristic or science-fiction appearance

SECONDARY FLOATING PORTRAIT:
- use PHOTO 2 as the expression reference
- place the secondary portrait in the ${position}
- smaller than the main portrait
- head-and-shoulders framing
- semi-transparent double-exposure appearance
- softly feathered edges
- subtle opacity
- dreamy but still photographic
- do not allow it to overpower the main portrait

COMPOSITION:
- square portrait
- professionally composed
- main portrait remains dominant
- realistic camera perspective
- authentic photographic appearance
- no illustration or digital-art appearance
- no text
- no logos
- no watermark
- no exaggerated shoulder pads
- no exaggerated makeup
- no caricature
- no comedy or parody styling

${intensityNotes}
`;

    const form = new FormData();

    form.append("model", "gpt-image-2");
    form.append("prompt", prompt);

    form.append("image[]", main, "main.jpg");
    form.append("image[]", corner, "corner.jpg");

    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("output_format", "jpeg");
    form.append("output_compression", "70");

    const upstream = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: form
      }
    );

    const result = await upstream
      .json()
      .catch(() => ({}));

    if (!upstream.ok) {
      return Response.json(
        {
          error:
            result?.error?.message ||
            `OpenAI error ${upstream.status}`
        },
        { status: upstream.status }
      );
    }

    const b64 = result?.data?.[0]?.b64_json;

    if (!b64) {
      return Response.json(
        { error: "No image returned." },
        { status: 502 }
      );
    }

    return Response.json({
      image: `data:image/jpeg;base64,${b64}`
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error?.message ||
          "Generation failed."
      },
      { status: 500 }
    );
  }
}
