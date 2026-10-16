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
        // без фильтров и с высоким качеством: исходники с Tilda и так уже сжаты
        sharp(src).rotate().resize({ width: w, withoutEnlargement: true, kernel: "lanczos3" })
          .webp({ quality: w > 1000 ? 84 : w > 600 ? 82 : 78, smartSubsample: true, effort: 5 })
          .toFile(`${base}-${w}.webp`)
      )
    );
    n++;
  }
}
console.log("optimized", n);
