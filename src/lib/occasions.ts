// Поводы: 9 форматов из content.ts + «Новый год и сезонные» (content.md §5).
// У каждого повода своя страница /povod/<slug>. Тексты — только из content/; чего нет — «[уточнить]».
import { FORMATS, PROMOS } from "./content";
import { rooms, type GroupId } from "./rooms";

export interface Occasion {
  id: string;
  slug: string;
  title: string;
  /** одна строка для карточки и подзаголовка страницы */
  line: string;
  /** зал, чьё фото на карточке */
  room: string;
  /** значение поля «Повод» в форме бронирования */
  form: string;
  /** какие залы подходят: по вместимости */
  groups: GroupId[];
  /** id акции из PROMOS, если она про этот повод */
  promo?: string;
}

const SLUGS: Record<string, string> = {
  bday: "den-rozhdeniya",
  karaoke: "karaoke-vecher",
  loft: "arenda-lofta",
  date: "svidanie",
  hen: "devichnik-malchishnik",
  corp: "korporativ",
  kids: "detskiy-prazdnik",
  prom: "vypusknoy",
  master: "master-klassy",
};
const GROUPS_FOR: Record<string, GroupId[]> = {
  bday: ["8-10", "15-20", "6-8"],
  karaoke: ["6-8", "8-10", "15-20"],
  loft: ["15-20", "8-10"],
  date: ["2-4"],
  hen: ["6-8", "8-10"],
  corp: ["15-20", "8-10"],
  kids: ["8-10", "15-20"],
  prom: ["15-20", "8-10"],
  master: ["15-20", "8-10"],
};

export const OCCASIONS: Occasion[] = [
  ...FORMATS.map((f) => ({
    id: f.id,
    slug: SLUGS[f.id],
    title: f.title,
    line: f.text,
    room: f.room,
    form: f.form,
    groups: GROUPS_FOR[f.id],
    promo: f.id === "bday" ? "bday" : undefined,
  })),
  {
    id: "season",
    slug: "novyy-god",
    title: "Новый год и сезонные",
    line: "Новый год, 14 и 23 февраля — сезонные форматы.",
    room: "premiya-oskar",
    form: "Вечеринка",
    groups: ["15-20", "8-10"],
  },
];

export const occasionBySlug = (slug: string) => OCCASIONS.find((o) => o.slug === slug);
export const promoOf = (o: Occasion) => (o.promo ? PROMOS.find((p) => p.id === o.promo) : undefined);

/** Залы под повод: нужные группы вместимости, «фото-зал» повода первым */
export const roomsFor = (o: Occasion) => {
  const fit = rooms.filter((r) => o.groups.includes(r.group));
  return [...fit.filter((r) => r.slug === o.room), ...fit.filter((r) => r.slug !== o.room)];
};
export const coverOf = (o: Occasion) => rooms.find((r) => r.slug === o.room)!;
