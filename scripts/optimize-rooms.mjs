// Делает WebP-версии фото залов (480 / 960 / 1600 px по ширине) рядом с оригиналами.
// Запуск после download-assets: node scripts/optimize-rooms.mjs
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public/img/rooms");
const WIDTHS = [480, 960, 1600];
let n = 0;
for (const slug of await readdir(dir)) {
  for (const f of await readdir(path.join(dir, slug))) {
    if (!/^\d+\.(jpe?g|png|webp)$/i.test(f)) continue;
    const src = path.join(dir, slug, f);
    const base = src.replace(/\.(jpe?g|png|webp)$/i, "");
    await Promise.all(
      WIDTHS.map((w) =>
        sharp(src).rotate().resize({ width: w, withoutEnlargement: true })
          .modulate({ saturation: 1.04 }).linear(1.06, -6)
          .webp({ quality: w > 1000 ? 74 : 70 }).toFile(`${base}-${w}.webp`)
      )
    );
    n++;
  }
}
console.log("optimized", n);
