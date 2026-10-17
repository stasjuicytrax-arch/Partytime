// Ссылки в Telegram-бота бронирования с меткой источника: t.me/<bot>?start=<метка>.
// Метка: только латиница, цифры и «_», до 64 символов — так требует Telegram для deep link.
// Полный список меток — docs/TZ.md, раздел «Конверсия и цели».
export const BOT_USERNAME = "PARTY_TIME_SPB_BOT";

export function botTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

export function botUrl(tag: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${botTag(tag)}`;
}

/** метка для зала: site_room_<slug>, дефисы в slug → «_» */
export const roomTag = (slug: string) => botTag(`site_room_${slug}`);
