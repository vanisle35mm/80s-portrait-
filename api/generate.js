const prompt = `
Create a photorealistic late-1980s school portrait using BOTH uploaded photos of the SAME person.

PHOTO 1 is the main portrait reference.
PHOTO 2 is the expression reference for the faded secondary portrait.

Preserve the person's identity very closely:
- facial structure
- apparent age
- skin tone
- eye color
- recognizable hairstyle and hair color
- natural facial proportions

The final image should look like a real professionally photographed school or department-store studio portrait from approximately 1987–1989, not a modern parody of the 1980s.

MAIN PORTRAIT:
- natural, believable school-photo pose
- ${blazer} late-1980s blazer
- moderate, realistic shoulder padding
- blazer should fit naturally and should not look like a costume
- simple light-colored shirt or blouse underneath
- natural skin texture
- realistic eyes, teeth, hair, and facial detail
- subtle period-appropriate grooming
- do not make the subject look older or younger than in the reference

LIGHTING:
- realistic soft studio key light
- gentle fill light
- believable catchlights in the eyes
- natural shadows around the face and clothing
- subtle vintage photographic softness
- avoid excessive airbrushing, plastic skin, or artificial glow

BACKGROUND:
- authentic dark navy, indigo, and muted purple studio backdrop
- a few soft hot-pink and electric-blue diagonal laser streaks
- laser beams remain behind the subject and are secondary to the portrait
- slight studio haze
- restrained late-1980s photo-lab glow
- no futuristic sci-fi effects

SECONDARY / FLOATING PORTRAIT:
- use PHOTO 2 for the facial expression
- place it in the ${position}
- smaller than the main portrait
- head-and-shoulders framing
- semi-transparent double-exposure appearance
- softly feathered edges
- lower opacity than the main portrait
- dreamy but still photographic
- do not let it overpower the main portrait

COMPOSITION:
- square portrait
- professionally composed
- main subject remains dominant
- realistic camera perspective
- photorealistic photography, not illustration or digital art
- no text
- no logos
- no watermarks
- no exaggerated shoulder pads
- no exaggerated makeup
- no caricature
- no comedy/parody styling

${
  level === "extra"
    ? "Increase the 1980s styling moderately: slightly brighter laser accents, a little more studio glow, and slightly stronger period styling, while keeping the result believable and photorealistic."
    : level === "subtle"
    ? "Keep the 1980s styling understated: very faint laser lines, minimal shoulder padding, very little haze, and a smaller secondary portrait."
    : "Use an authentic, tasteful, believable late-1980s school-portrait aesthetic."
}
`;
