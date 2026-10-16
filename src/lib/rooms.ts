import data from "../../content/rooms.json";

export type GroupId = "2-4" | "6-8" | "8-10" | "15-20";
export type LocId = "dumskaya" | "mayakovskaya" | "leninskiy" | "komendantskiy";

export interface Location {
  id: LocId;
  active: boolean;
  name: string;
  address: string;
  metro: string;
  phone?: string;
  rooms?: number;
  badge?: string;
}

interface RawRoom {
  loc: LocId;
  slug: string;
  title: string;
  group: GroupId;
  guests: number | null;
  area: number | null;
  price: number;
  tagline: string;
  text: string;
  photos: string[];
}

export interface Photo {
  src: string;
  srcset: string;
}

export interface Room extends RawRoom {
  locName: string;
  images: Photo[];
}

export const GROUPS: { id: GroupId; label: string; max: number; color: string }[] = [
  { id: "2-4", label: "2–4", max: 4, color: "var(--c-cap-2-4)" },
  { id: "6-8", label: "6–8", max: 8, color: "var(--c-cap-6-8)" },
  { id: "8-10", label: "8–10", max: 10, color: "var(--c-cap-8-10)" },
  { id: "15-20", label: "15–20", max: 20, color: "var(--c-cap-15-20)" },
];
export const groupById = Object.fromEntries(GROUPS.map((g) => [g.id, g])) as Record<GroupId, (typeof GROUPS)[number]>;

/** Включено в аренду (content.md §4) */
export const INCLUDED = [
  "Проектор с большим экраном",
  "Караоке через YouTube / VK Видео",
  "2 беспроводных микрофона",
  "Настольные игры",
  "Уборка после праздника",
];
export const PROMO = "Пакетное предложение — скидка до 20% на аренду. Уточняйте у менеджера.";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function imagesFor(r: RawRoom): Photo[] {
  return r.photos.map((_, i) => {
    const stem = `${BASE}/img/rooms/${r.slug}/${String(i + 1).padStart(2, "0")}`;
    return {
      src: `${stem}-960.webp`,
      srcset: `${stem}-480.webp 480w, ${stem}-960.webp 960w, ${stem}-1600.webp 1600w`,
    };
  });
}

export const locations = data.locations as Location[];
const locName = Object.fromEntries(locations.map((l) => [l.id, l.name]));

/** Сортировка: от больших залов к меньшим (группа → точная вместимость → площадь → цена) */
export const rooms: Room[] = (data.rooms as RawRoom[])
  .map((r) => ({ ...r, locName: locName[r.loc], images: imagesFor(r) }))
  .sort(
    (a, b) =>
      groupById[b.group].max - groupById[a.group].max ||
      (b.guests ?? 0) - (a.guests ?? 0) ||
      (b.area ?? 0) - (a.area ?? 0) ||
      b.price - a.price
  );

export const activeLocations = locations.filter((l) => l.active);
export const totalRooms = rooms.length;
/** Залов во всей сети (4 локации) — подтверждено заказчиком 16.10.2026 */
export const networkRooms = 56;
export const minPrice = Math.min(...rooms.map((r) => r.price));

/** «1 550 ₽» с неразрывными пробелами (Intl ru не группирует 4-значные числа) */
const group3 = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const rub = (n: number) => `${group3(n)} ₽`;

export function capacityLabel(r: Room) {
  return r.guests ? `до ${r.guests} гостей` : `${groupById[r.group].label} гостей`;
}

export function roomAlt(r: Room, i = 0) {
  return i === 0
    ? `Зал «${r.title}» на ${r.loc === "dumskaya" ? "Думской" : "Маяковской"}: ${r.tagline.toLowerCase()}`
    : `Зал «${r.title}», фото ${i + 1}`;
}

/** Данные для клиентского скрипта (модалка) */
export const roomsClientData = rooms.map((r) => ({
  slug: r.slug,
  loc: r.loc,
  locName: r.locName,
  title: r.title,
  group: r.group,
  capacity: capacityLabel(r),
  area: r.area,
  price: rub(r.price),
  tagline: r.tagline,
  text: r.text,
  images: r.images.map((im, i) => ({ ...im, alt: roomAlt(r, i) })),
}));

export const PHONE_MAIN = "+7 (812) 214-30-03";
export const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;
