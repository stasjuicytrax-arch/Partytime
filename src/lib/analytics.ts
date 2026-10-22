// Обёртка над Яндекс Метрикой. Без ID счётчика (src/config/analytics.ts) ничего не делает.
// Список целей и их параметров — docs/TZ.md, раздел «Конверсия и цели».
import { analytics } from "../config/analytics";

type Ym = (id: number, method: string, ...args: unknown[]) => void;
const ym = (): Ym | null => {
  const id = analytics.yandexMetrika;
  const fn = (window as unknown as { ym?: Ym }).ym;
  return id && typeof fn === "function" ? fn : null;
};

export type Goal =
  | "messenger_click"
  | "phone_click"
  | "popup_tg_show"
  | "popup_tg_click"
  | "exit_popup_show"
  | "exit_popup_click"
  | "bday_dates_click"
  | "room_open"
  | "similar_room_click"
  | "room_next"
  | "video_play"
  | `form_step_${1 | 2 | 3 | 4 | 5 | 6}`
  | "form_submit"
  | "form_to_telegram";

export function reachGoal(goal: Goal, params?: Record<string, unknown>) {
  const f = ym();
  if (import.meta.env.DEV) console.debug("[goal]", goal, params ?? "");
  if (!f) return;
  try {
    f(Number(analytics.yandexMetrika), "reachGoal", goal, params);
  } catch {}
}

/** Виртуальный просмотр страницы (модалка зала = «страница» для цели «6+ страниц») */
export function hit(url: string, title?: string) {
  const f = ym();
  if (import.meta.env.DEV) console.debug("[hit]", url);
  if (!f) return;
  try {
    f(Number(analytics.yandexMetrika), "hit", url, { title, referer: location.href });
  } catch {}
}

/** Канал мессенджера по ссылке */
export function channelOf(href: string): "telegram" | "vk" | "max" | null {
  if (/t\.me\//.test(href)) return "telegram";
  if (/vk\.(me|com)\//.test(href)) return "vk";
  if (/max\.ru|max\.me/.test(href)) return "max";
  return null;
}

/**
 * Один делегированный обработчик на документ: клики по мессенджерам и телефонам.
 * Место на странице — из ближайшего [data-place] или id секции.
 */
export function initClickGoals() {
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const place = a.closest<HTMLElement>("[data-place]")?.dataset.place || a.closest("section[id]")?.id || "page";
      if (href.startsWith("tel:")) return reachGoal("phone_click", { place });
      const channel = channelOf(href);
      if (channel) reachGoal("messenger_click", { channel, place });
    },
    { capture: true }
  );
}
