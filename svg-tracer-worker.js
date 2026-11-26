importScripts("https://cdn.jsdelivr.net/npm/imagetracerjs@1.2.6/imagetracer_v1.2.6.js");

self.addEventListener("message", (event) => {
  try {
    const { pixels, width, height } = event.data;
    const data = new Uint8ClampedArray(pixels);
    let sampled = 0;
    let nearBlackOrWhite = 0;
    for (let index = 0; index < data.length; index += 16) {
      if (data[index + 3] < 16) continue;
      const brightness = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      if (brightness < 40 || brightness > 215) nearBlackOrWhite += 1;
      sampled += 1;
    }
    const numberofcolors = sampled && nearBlackOrWhite / sampled > 0.92 ? 2 : 8;
    const imageData = new ImageData(data, width, height);
    const svg = self.ImageTracer.imagedataToSVG(imageData, {
      numberofcolors,
      colorsampling: 2,
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      roundcoords: 1,
      scale: 1,
      strokewidth: 0
    });
    self.postMessage({ svg });
  } catch (error) {
    self.postMessage({ error: error.message || "The photo could not be converted." });
  }
});
