// Постеры и пропорции роликов Kinescope (content/videos.json) → content/videos-meta.json + public/img/video/<id>.webp.
// Запуск: node scripts/fetch-video-meta.mjs (нужен интернет; sharp из зависимостей Astro).
import fs from "node:fs";
import sharp from "sharp";

const v = JSON.parse(fs.readFileSync("content/videos.json", "utf8"));
const ids = [...Object.values(v.rooms), ...Object.values(v.overview).map((o) => o.id)];
fs.mkdirSync("public/img/video", { recursive: true });
const meta = {};
for (const id of ids) {
  try {
    const o = await (await fetch(`https://kinescope.io/oembed?url=https://kinescope.io/${id}&format=json`)).json();
    const w = Number(o.width), h = Number(o.height);
    meta[id] = { w, h, poster: null };
    if (o.thumbnail_url) {
      const buf = Buffer.from(await (await fetch(o.thumbnail_url)).arrayBuffer());
      await sharp(buf).resize({ width: 540, withoutEnlargement: true }).webp({ quality: 74 }).toFile(`public/img/video/${id}.webp`);
      meta[id].poster = `img/video/${id}.webp`;
    }
    console.log(id, w, h, !!meta[id].poster);
  } catch (e) {
    console.log(id, "ошибка", e.message);
  }
}
fs.writeFileSync("content/videos-meta.json", JSON.stringify(meta, null, 2) + "\n");
