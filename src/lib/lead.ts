// Отправка заявки. Цель интеграции — RestoPlace (сюда сейчас падают брони со старого сайта),
// способ подключения уточняется [уточнить]. Пока: console + экран успеха.
// Когда появится адрес (вебхук RestoPlace, Telegram-бот или CRM) — указать его в LEAD_ENDPOINT.

export interface Lead {
  date: string;
  time: string;
  duration: string;
  adults: number;
  kids: number;
  place: string;
  room?: string;
  roomTitle?: string;
  occasion: string;
  occasionOther?: string;
  extras: string[];
  name: string;
  phone: string;
  contactWay: string;
  source: string;
}

/** Пусто — заявки не уходят по сети, только в консоль (режим презентации) */
export const LEAD_ENDPOINT = "";

export async function sendLead(lead: Lead): Promise<{ ok: boolean }> {
  console.info("[lead]", lead);
  if (!LEAD_ENDPOINT) {
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true };
  }
  try {
    const r = await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    return { ok: r.ok };
  } catch {
    return { ok: false };
  }
}
