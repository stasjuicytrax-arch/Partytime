// Акции: у каждой своя страница /akcii/<slug>. Тексты — из content.ts (PROMOS);
// условий, которых нет в content/, не выдумываем — на странице стоит «[уточнить]».
import { PROMOS } from "./content";

const SLUGS: Record<string, string> = {
  bday: "den-rozhdeniya-dve-nedeli",
  "3plus1": "3-plus-1",
  mafia: "mafiya-po-chetvergam",
  menu: "novoe-menyu",
  tg: "telegram",
  loyalty: "bally-loyalnosti",
};
// TODO: условия, сроки и ограничения каждой акции — получить у заказчика
export const PROMO_PAGES = PROMOS.map((p) => ({ ...p, slug: SLUGS[p.id] }));
export type PromoPage = (typeof PROMO_PAGES)[number];
