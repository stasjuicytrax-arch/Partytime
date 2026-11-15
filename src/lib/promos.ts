// Акции: тексты — из content.ts (PROMOS).
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
export const PROMO_PAGES = PROMOS.map((p) => {
  const slug = SLUGS[p.id];
  const path = p.id === "loyalty" ? "loyalty" : "akcii/" + slug;
  return { ...p, slug, path };
});
export type PromoPage = (typeof PROMO_PAGES)[number];
