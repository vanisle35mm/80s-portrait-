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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";
  statusEl.classList.remove("error");
  resultSection.classList.add("hidden");

  const formData = new FormData(form);

  setLoading(true);
  statusEl.textContent = "Developing your portrait… this can take around a minute or two.";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Generation failed.");
    }

    resultImage.src = data.image;
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    statusEl.textContent = "Done. Shoulder pads successfully activated.";
  } catch (error) {
    statusEl.textContent = error.message || "Something went wrong.";
    statusEl.classList.add("error");
  } finally {
    setLoading(false);
  }
});

downloadBtn.addEventListener("click", async () => {
  if (!resultImage.src) return;

  try {
    const response = await fetch(resultImage.src);
    const blob = await response.blob();
    const file = new File([blob], "retro-laser-portrait.png", { type: "image/png" });

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
  a.download = "retro-laser-portrait.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

function setLoading(loading) {
  generateBtn.disabled = loading;
  buttonText.classList.toggle("hidden", loading);
  spinner.classList.toggle("hidden", !loading);
}
