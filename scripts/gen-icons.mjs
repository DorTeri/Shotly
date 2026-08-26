// Rasterises public/mark.svg into the icon set Next.js and the manifest expect.
// Run with `npm run icons` after changing the mark.
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/mark.svg");

const targets = [
  ["src/app/icon.png", 512], // favicon — Next serves and downsizes this
  ["src/app/apple-icon.png", 180], // iOS home screen
  ["public/icon-192.png", 192], // manifest
  ["public/icon-512.png", 512], // manifest
];

for (const [out, size] of targets) {
  await sharp(svg, { density: 400 }).resize(size, size).png().toFile(out);
  console.log(`  ${out}  ${size}x${size}`);
}
