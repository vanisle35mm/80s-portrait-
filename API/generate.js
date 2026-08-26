function dataUrlToBlob(dataUrl, label) {
  if (typeof dataUrl !== "string") {
    throw new Error(`${label} is missing.`);
  }

  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error(`${label} is not a supported image.`);
  }

  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");

  if (bytes.length > 1_700_000) {
    const error = new Error(`${label} is too large after compression.`);
    error.statusCode = 413;
    throw error;
  }

  return {
    blob: new Blob([bytes], { type: mime }),
    mime,
    size: bytes.length,
  };
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.reject(new Error("Invalid JSON request."));
    }
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5_000_000) {
        reject(Object.assign(new Error("Request too large."), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON request."));
      }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing in Vercel Environment Variables.",
      });
    }

    const body = await readJsonBody(req);

    const {
      mainPhoto,
      cornerPhoto,
      blazerColor = "dusty pink",
      cornerPosition = "upper left",
      intensity = "classic",
    } = body || {};

    const main = dataUrlToBlob(mainPhoto, "Main photo");
    const corner = dataUrlToBlob(cornerPhoto, "Corner photo");

    const styleNotes =
      intensity === "extra"
        ? "Push the late-1980s glamour strongly: more neon laser lines, stronger soft-focus glow, bigger shoulder pads, and richer blue-purple studio haze."
        : intensity === "subtle"
        ? "Keep the late-1980s styling tasteful and relatively subtle: restrained lasers, gentle soft-focus, and modest shoulder pads."
        : "Use a classic unmistakable late-1980s school-photo studio aesthetic with neon lasers, soft-focus glamour lighting, padded shoulders, and blue-purple haze.";

    const prompt = `
Create a polished photorealistic late-1980s school-portrait studio composite using BOTH uploaded photos of the SAME person.

IMAGE 1 is the PRIMARY portrait reference. Preserve the person's identity, facial structure, age, skin tone, eye color, and recognizable hair as closely as possible. Use it for the main posed portrait.

IMAGE 2 is the SECONDARY expression reference. Use it for a large dreamy translucent double-exposure portrait in the ${cornerPosition}. Preserve the same person's identity and the expression from image 2.

Main portrait styling:
- ${String(blazerColor).slice(0, 50)} oversized late-1980s blazer with padded shoulders
- simple light-colored top underneath
- age-appropriate natural styling
- professional school-portrait pose
- no text, logos, watermarks, or school name

Background:
- deep navy, indigo, and purple studio backdrop
- diagonal electric-blue and hot-pink laser beams
- subtle haze, airbrushed glow, and vintage photo-lab softness
- authentic late-1980s mall / school / yearbook portrait feeling

Secondary portrait:
- large faded head-and-shoulders image in the ${cornerPosition}
- semi-transparent with softly feathered edges
- clearly visible but dreamlike
- expression comes from image 2

Composition:
- square portrait
- main subject lower-right / center-right enough to leave room for the double exposure
- believable studio lighting
- photorealistic, not illustrated
- do not age the person up or down

${styleNotes}
`;

    const form = new FormData();
    form.append("model", "gpt-image-2");
    form.append("prompt", prompt);

    // Multiple image edit inputs are sent as repeated image[] multipart fields.
    form.append("image[]", main.blob, "main.jpg");
    form.append("image[]", corner.blob, "corner.jpg");

    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("output_format", "jpeg");
    form.append("output_compression", "72");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 280_000);

    let upstream;
    try {
      upstream = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: form,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const text = await upstream.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw Object.assign(
        new Error(`OpenAI returned a non-JSON response (${upstream.status}).`),
        { statusCode: upstream.status || 502 }
      );
    }

    if (!upstream.ok) {
      const message =
        result?.error?.message ||
        result?.message ||
        `OpenAI request failed (${upstream.status}).`;

      return res.status(upstream.status).json({ error: message });
    }

    const b64 = result?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({
        error: "OpenAI completed the request but did not return image data.",
      });
    }

    return res.status(200).json({
      image: `data:image/jpeg;base64,${b64}`,
    });
  } catch (error) {
    console.error("generate failed", error);

    if (error?.name === "AbortError") {
      return res.status(504).json({
        error: "The image generation took too long. Please try again.",
      });
    }

    const status =
      Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 600
        ? Number(error.statusCode)
        : 500;

    return res.status(status).json({
      error: error?.message || "Generation failed.",
    });
  }
};
