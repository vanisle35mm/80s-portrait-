const form = document.getElementById("portraitForm");
const generateBtn = document.getElementById("generateBtn");
const buttonText = generateBtn.querySelector(".button-text");
const spinner = generateBtn.querySelector(".spinner");
const statusEl = document.getElementById("status");
const resultSection = document.getElementById("resultSection");
const resultImage = document.getElementById("resultImage");
const downloadBtn = document.getElementById("downloadBtn");

function wirePreview(inputId, previewId, dropId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const drop = document.getElementById(dropId);

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.onload = () => URL.revokeObjectURL(url);
    preview.classList.remove("hidden");
    drop.classList.add("has-image");
  });
}

wirePreview("mainPhoto", "mainPreview", "mainDrop");
wirePreview("cornerPhoto", "cornerPreview", "cornerDrop");

async function resizeForUpload(file) {
  const bitmap = await createImageBitmap(file);

  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);

  bitmap.close?.();

  // Small enough for Vercel, still plenty of detail for identity preservation.
  return canvas.toDataURL("image/jpeg", 0.72);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const mainFile = document.getElementById("mainPhoto").files?.[0];
  const cornerFile = document.getElementById("cornerPhoto").files?.[0];
  const consent = document.getElementById("consent").checked;

  if (!mainFile || !cornerFile) {
    showError("Please choose both photos.");
    return;
  }

  if (!consent) {
    showError("Please confirm you have permission to use the photos.");
    return;
  }

  setLoading(true);
  resultSection.classList.add("hidden");
  statusEl.classList.remove("error");
  statusEl.textContent = "Preparing your photos…";

  try {
    const [mainPhoto, cornerPhoto] = await Promise.all([
      resizeForUpload(mainFile),
      resizeForUpload(cornerFile),
    ]);

    statusEl.textContent = "Developing your 80s portrait… this may take a minute.";

    const payload = {
      mainPhoto,
      cornerPhoto,
      blazerColor: form.elements.blazerColor.value,
      cornerPosition: form.elements.cornerPosition.value,
      intensity: form.elements.intensity.value,
    };

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Server error (${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Generation failed (${response.status}).`);
    }

    resultImage.src = data.image;
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    statusEl.textContent = "Done. Shoulder pads successfully activated.";
  } catch (error) {
    showError(error?.message || "Something went wrong.");
  } finally {
    setLoading(false);
  }
});

downloadBtn.addEventListener("click", async () => {
  if (!resultImage.src) return;

  try {
    const response = await fetch(resultImage.src);
    const blob = await response.blob();
    const file = new File([blob], "retro-laser-portrait.jpg", {
      type: "image/jpeg",
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Retro Laser Portrait",
        text: "My 80s laser school portrait",
        files: [file],
      });
      return;
    }
  } catch (_) {}

  const a = document.createElement("a");
  a.href = resultImage.src;
  a.download = "retro-laser-portrait.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

function showError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("error");
}

function setLoading(loading) {
  generateBtn.disabled = loading;
  buttonText.classList.toggle("hidden", loading);
  spinner.classList.toggle("hidden", !loading);
}

async function checkServer() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    const info = await r.json();
    if (!r.ok || !info.ok) throw new Error("Server health check failed.");

    if (!info.apiKeyConfigured) {
      showError("App is online, but OPENAI_API_KEY is missing in Vercel.");
      generateBtn.disabled = true;
      return;
    }

    statusEl.textContent = "Server ready.";
  } catch (e) {
    showError("The Vercel backend is not responding yet.");
  }
}

window.addEventListener("load", checkServer);

// Keep the PWA installable, but always prefer fresh app files after redeploys.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
  });
}
