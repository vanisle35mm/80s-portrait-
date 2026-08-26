import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WebP images are supported."));
    }
    cb(null, true);
  },
});

app.use(express.static("public"));

app.post(
  "/api/generate",
  upload.fields([
    { name: "mainPhoto", maxCount: 1 },
    { name: "cornerPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "OPENAI_API_KEY is not configured on the server.",
        });
      }

      const main = req.files?.mainPhoto?.[0];
      const corner = req.files?.cornerPhoto?.[0];

      if (!main || !corner) {
        return res.status(400).json({
          error: "Please upload both a main portrait and a corner-expression photo.",
        });
      }

      const blazerColor = String(req.body.blazerColor || "dusty pink").slice(0, 50);
      const cornerPosition = String(req.body.cornerPosition || "upper left");
      const intensity = String(req.body.intensity || "classic");

      const styleNotes =
        intensity === "extra"
          ? "Push the 1980s glamour strongly: more neon laser lines, stronger soft-focus glow, bigger shoulder pads, richer blue-purple studio haze."
          : intensity === "subtle"
          ? "Keep the 1980s styling tasteful and relatively subtle: restrained lasers, gentle soft-focus, modest shoulder pads."
          : "Use a classic, unmistakable 1980s school-photo studio aesthetic with neon lasers, soft-focus glamour lighting, padded shoulders, and blue-purple haze.";

      const prompt = `
Create a polished photorealistic 1980s school-portrait studio composite using BOTH uploaded photos of the SAME person.

IMAGE 1 is the PRIMARY portrait reference. Preserve the person's identity, facial structure, age, skin tone, eye color, and recognizable hair as closely as possible. Use it for the main centered/bust portrait.

IMAGE 2 is the SECONDARY expression reference. Use it only to create a large dreamy translucent double-exposure portrait in the ${cornerPosition}, like classic 1980s school-photo composite portraits. Preserve the same person's identity and the expression from image 2.

Main portrait styling:
- ${blazerColor} oversized 1980s blazer with padded shoulders
- simple light-colored top underneath
- age-appropriate, natural styling
- professional school-portrait pose
- no text, logos, watermarks, or school name

Background:
- deep navy / indigo / purple studio backdrop
- diagonal electric-blue and hot-pink laser beams
- subtle haze, airbrushed glow, and vintage photo-lab softness
- authentic late-1980s mall/studio/yearbook portrait feeling

Secondary portrait:
- large faded head-and-shoulders image in the ${cornerPosition}
- semi-transparent, softly feathered edges
- clearly visible but dreamlike
- the expression should come from image 2

Composition:
- square portrait
- main subject occupies the lower-right / center-right area enough to leave room for the double exposure
- clean, believable studio lighting
- photorealistic, not illustrated
- do not age the person up or down

${styleNotes}
`;

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const mainFile = await toFile(main.buffer, main.originalname || "main.jpg", {
        type: main.mimetype,
      });
      const cornerFile = await toFile(
        corner.buffer,
        corner.originalname || "corner.jpg",
        { type: corner.mimetype }
      );

      const result = await client.images.edit({
        model: "gpt-image-2",
        image: [mainFile, cornerFile],
        prompt,
        size: "1024x1024",
        quality: "high",
      });

      const b64 = result.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("No image was returned by the image model.");
      }

      res.json({
        image: `data:image/png;base64,${b64}`,
      });
    } catch (error) {
      console.error(error);
      const message =
        error?.error?.message ||
        error?.message ||
        "Something went wrong while generating the portrait.";
      res.status(500).json({ error: message });
    }
  }
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Upload failed." });
});

app.listen(port, () => {
  console.log(`Retro Laser Portrait running at http://localhost:${port}`);
});
