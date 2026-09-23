import sharp from "sharp";

// Imagegen-enhanced 1774×887 source. These are delivery upscales, not native 4K.
const source = "assets/media/cinematic-world-v2-source.png";
for (const [suffix, width, quality] of [["4k", 3840, 94], ["mobile", 1920, 88]]) {
  const output = `public/media/final/cinematic-world-v2-${suffix}.webp`;
  const info = await sharp(source)
    .resize(width, width / 2, { kernel: "lanczos3" })
    .webp({ quality, effort: 6 })
    .toFile(output);
  console.log(`${output}: ${info.width}×${info.height}, ${info.size} bytes`);
}
