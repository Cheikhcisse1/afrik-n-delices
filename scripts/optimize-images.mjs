// Génère les images WebP du site à partir des photos sources.
// Usage (Docker, sans Node local) :
//   docker run --rm -v "$PWD":/app -w /app node:22-alpine sh -c "npm i --no-save sharp@0.33.5 && node scripts/optimize-images.mjs"
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "photos-src";
const OUT = "public/images";
mkdirSync(OUT, { recursive: true });

const photos = {
  1: "comptoir-service",
  2: "equipe-camion",
  3: "carte-camion",
  4: "cuisine-friteuse",
  5: "barquettes-comptoir",
  6: "accueil-sourire",
};

for (const [n, name] of Object.entries(photos)) {
  for (const w of [1600, 800]) {
    await sharp(`${SRC}/${n}.jpg`).rotate().resize({ width: w }).webp({ quality: 74 }).toFile(`${OUT}/${name}-${w}.webp`);
  }
}
// Image de partage (Open Graph) 1200x630
await sharp(`${SRC}/6.jpg`).rotate().resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 80, mozjpeg: true }).toFile(`${OUT}/og-image.jpg`);
console.log("Images générées dans", OUT);
