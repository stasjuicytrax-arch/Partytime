// Скачивает фото залов (Tilda CDN старого сайта) и 3D-иконки (3dicons.co, лицензия CC0).
// Запуск из корня проекта: node scripts/download-assets.mjs
// Node 18+ (встроенный fetch).
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rooms = JSON.parse(await readFile(path.join(root, "content/rooms.json"), "utf8")).rooms;

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function download(url, dest) {
  if (await exists(dest)) return "skip";
  await mkdir(path.dirname(dest), { recursive: true });
  // основной адрес Tilda CDN бывает недоступен из сети — пробуем зеркала того же хранилища
  const urls = url.includes("static.tildacdn.com/")
    ? ["com", "one", "info", "net"].map((tld) => url.replace("static.tildacdn.com/", `static.tildacdn.${tld}/`))
    : [url];
  for (let i = 0; i < 3 * urls.length; i++) {
    const u = urls[Math.floor(i / 3)];
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(r.status + " " + u);
      await writeFile(dest, Buffer.from(await r.arrayBuffer()));
      return "ok";
    } catch (e) {
      if (i === 3 * urls.length - 1) { console.error("FAIL", url, e.message); return "fail"; }
      await new Promise((res) => setTimeout(res, 800));
    }
  }
}

// 1) Фото залов
const jobs = [];
for (const room of rooms) {
  room.photos.forEach((p, i) => {
    const ext = path.extname(p) || ".jpg";
    const dest = path.join(root, "public/img/rooms", room.slug, String(i + 1).padStart(2, "0") + ext);
    jobs.push([`https://static.tildacdn.com/${p}`, dest]);
  });
}

// 2) 3D-иконки 3dicons (CC0). Ракурсы: dynamic | front | iso. Стили: color | premium | gradient | clay. Максимум 400px.
const ICONS = {
  "fddbbc-mic": "mic",
  "331e9c-music": "music",
  "17125d-star": "star",
  "6bfe8c-fire": "fire",
  "3f0398-gift": "gift",
  "634b4b-crown": "crown",
  "1acc3d-heart": "heart",
  "b81ead-headphone": "headphone",
  "1858b9-map-pin": "map-pin",
  "781f28-calendar": "calendar",
  "eec43d-chat-bubble": "chat",
  "f1cab8-glass": "glass",
  "8034f3-sphere": "sphere",
  "49654f-trophy": "trophy",
  "744cc0-rocket": "rocket",
  "313578-megaphone": "megaphone",
  "8ef1fa-clock": "clock",
  "5656e5-camera": "camera",
};
const STYLES = ["color", "premium", "gradient"];
const ANGLES = ["dynamic", "front"];
const base = "https://bvconuycpdvgzbvbkijl.supabase.co/storage/v1/object/public/sizes";
for (const [id, name] of Object.entries(ICONS)) {
  for (const angle of ANGLES) for (const style of STYLES) {
    jobs.push([`${base}/${id}/${angle}/400/${style}.webp`, path.join(root, "public/img/3d", `${name}-${angle}-${style}.webp`)]);
  }
}

// Параллельно по 6
let done = 0; const stats = { ok: 0, skip: 0, fail: 0 };
const queue = [...jobs];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const [url, dest] = queue.shift();
    stats[await download(url, dest)]++;
    if (++done % 25 === 0) console.log(`${done}/${jobs.length}`);
  }
}));
console.log("Готово:", stats);
