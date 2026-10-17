import { gsap } from "gsap";
import { reduced } from "./motion";
import { sendLead, type Lead } from "../lib/lead";
import { reachGoal, type Goal } from "../lib/analytics";
import { botUrl } from "../lib/bot";
import { OFFER } from "../config/offer";
import type { Mic3D } from "./fx/mic3d";

const KEY = "pt:booking";

/** Маска +7 (XXX) XXX-XX-XX */
function maskPhone(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  const p = d.slice(1);
  let out = "+7";
  if (p.length) out += " (" + p.slice(0, 3);
  if (p.length >= 3) out += ")";
  if (p.length > 3) out += " " + p.slice(3, 6);
  if (p.length > 6) out += "-" + p.slice(6, 8);
  if (p.length > 8) out += "-" + p.slice(8, 10);
  return out;
}

export function initBooking(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-form]")!;
  const steps = [...form.querySelectorAll<HTMLElement>("[data-step]")];
  const eq = [...form.querySelectorAll<HTMLElement>("[data-eq]")];
  const count = form.querySelector<HTMLElement>("[data-count]")!;
  const back = form.querySelector<HTMLButtonElement>("[data-back]")!;
  const nextLabel = form.querySelector<HTMLElement>("[data-next-label]")!;
  const nav = form.querySelector<HTMLElement>("[data-nav]")!;
  const error = form.querySelector<HTMLElement>("[data-error]")!;
  const success = form.querySelector<HTMLElement>("[data-success]")!;
  const roomBox = form.querySelector<HTMLElement>("[data-room]")!;
  const roomTitle = form.querySelector<HTMLElement>("[data-room-title]")!;
  const branch = form.querySelector<HTMLElement>("[data-branch]")!;
  const branchText = form.querySelector<HTMLElement>("[data-branch-text]")!;
  const branchLink = form.querySelector<HTMLAnchorElement>("[data-branch-link]")!;
  const stepTg = [...form.querySelectorAll<HTMLAnchorElement>("[data-step-tg]")];
  const seenSteps = new Set<number>();
  const phone = form.querySelector<HTMLInputElement>("[data-phone]")!;
  const date = form.querySelector<HTMLInputElement>("[data-date]")!;
  const canvas = root.querySelector<HTMLCanvasElement>("[data-mic-canvas]")!;
  let i = 0;
  let mic: Mic3D | null = null;
  let room: { slug: string; title: string } | null = null;

  // минимальная дата — сегодня
  const today = new Date();
  date.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  /* ---------- сохранение между шагами ---------- */
  const save = () => {
    const fd = new FormData(form);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      if (k === "extras") (data.extras = (data.extras as string[]) || []).push(String(v));
      else data[k] = v;
    });
    data.step = i;
    if (room) data.room = room.slug;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  };
  const restore = () => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {}
    apply(data);
  };
  function apply(data: Record<string, unknown>) {
    for (const [k, v] of Object.entries(data)) {
      if (k === "extras" && Array.isArray(v)) {
        form.querySelectorAll<HTMLInputElement>('input[name="extras"]').forEach((c) => (c.checked = v.includes(c.value)));
        continue;
      }
      if (k === "loc") {
        const r = form.querySelector<HTMLInputElement>(`input[name="place"][value="${v}"]`);
        if (r) r.checked = true;
        continue;
      }
      if (k === "room" && typeof v === "string") {
        setRoom(v);
        continue;
      }
      const el = form.elements.namedItem(k);
      if (!el) continue;
      if (el instanceof RadioNodeList) {
        const r = [...el].find((x) => (x as HTMLInputElement).value === v) as HTMLInputElement | undefined;
        if (r) r.checked = true;
      } else if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = !!v;
      else if ("value" in el) (el as HTMLInputElement).value = String(v);
    }
    toggleOther();
  }

  function setRoom(slug: string | null) {
    if (!slug) {
      room = null;
      roomBox.hidden = true;
      return;
    }
    const data = JSON.parse(document.getElementById("rooms-data")?.textContent || "[]") as { slug: string; title: string; loc: string; locName: string }[];
    const r = data.find((x) => x.slug === slug);
    if (!r) return;
    room = { slug, title: r.title };
    roomTitle.textContent = `«${r.title}», ${r.locName}`;
    roomBox.hidden = false;
    const place = form.querySelector<HTMLInputElement>(`input[name="place"][value="${r.loc}"]`);
    if (place) place.checked = true;
  }
  form.querySelector("[data-room-clear]")!.addEventListener("click", () => {
    setRoom(null);
    save();
  });

  const occasion = () => (form.elements.namedItem("occasion") as RadioNodeList).value;
  /** ответвление шага «Когда?»: подарок ко ДР или свободные залы на дату — в боте */
  const toggleOther = () => {
    const bday = occasion() === "ДР";
    branch.hidden = !date.value;
    branchText.textContent = bday ? OFFER.bday : OFFER.dates;
    // дата едет в метку: site_bday_20261121 — бот сразу знает, о каком дне речь
    branchLink.href = botUrl(`${bday ? "site_bday" : "site_dates"}_${date.value.replace(/-/g, "")}`);
    branchLink.dataset.kind = bday ? "bday" : "dates";
  };
  branchLink.addEventListener("click", () => reachGoal("bday_dates_click", { place: "form", kind: branchLink.dataset.kind }));
  stepTg.forEach((a) => a.addEventListener("click", () => reachGoal("form_to_telegram", { step: Number(a.dataset.stepTg) })));

  /* ---------- шаг 1: один тап по карточке повода сразу ведёт дальше ---------- */
  const advanceFromOccasion = () => {
    if (i !== 0 || !occasion()) return;
    save();
    setTimeout(() => {
      if (i !== 0) return;
      i = 1;
      save();
      render(1);
      focusStep();
    }, reduced() ? 0 : 260);
  };
  // вперёд — только по тапу/клику или Enter/пробелу; стрелки просто листают варианты
  form.querySelectorAll<HTMLInputElement>('input[name="occasion"]').forEach((r) => {
    r.closest("label")!.addEventListener("click", (e) => {
      if (e.detail > 0) setTimeout(advanceFromOccasion, 0);
    });
    r.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      r.checked = true;
      r.dispatchEvent(new Event("change", { bubbles: true }));
      advanceFromOccasion();
    });
  });
  form.addEventListener("change", () => {
    toggleOther();
    save();
  });
  form.addEventListener("input", save);

  /* ---------- степперы гостей ---------- */
  form.querySelectorAll<HTMLElement>("[data-stepper]").forEach((s) => {
    const inp = s.querySelector("input")!;
    const set = (d: number) => {
      const v = Math.min(Number(inp.max), Math.max(Number(inp.min), (Number(inp.value) || 0) + d));
      inp.value = String(v);
      save();
    };
    s.querySelector("[data-dec]")!.addEventListener("click", () => set(-1));
    s.querySelector("[data-inc]")!.addEventListener("click", () => set(1));
  });

  phone.addEventListener("input", () => {
    phone.value = maskPhone(phone.value);
  });
  phone.addEventListener("focus", () => {
    if (!phone.value) phone.value = "+7 (";
  });

  /* ---------- шаги ---------- */
  function validate(): string {
    if (i === 0 && !occasion()) return "Выберите повод — один тап.";
    if (i === 3 && !date.value) return "Выберите дату праздника.";
    if (i === 3 && date.value < date.min) return "Эта дата уже прошла — выберите другую.";
    if (i === 5) {
      const fd = new FormData(form);
      if (!String(fd.get("name") || "").trim()) return "Как к вам обращаться?";
      if (String(fd.get("phone") || "").replace(/\D/g, "").length !== 11) return "Проверьте номер телефона: нужно 10 цифр после +7.";
      if (!fd.get("consent")) return "Нужно согласие на обработку данных.";
      if (!fd.get("minors")) return "Подтвердите правило про несовершеннолетних.";
    }
    return "";
  }

  // после смены шага фокус — на заголовок шага: экранный диктор прочитает, куда попали
  const focusStep = () => steps[i].querySelector<HTMLElement>("legend")?.focus({ preventScroll: true });

  function render(dir = 1) {
    steps.forEach((s, k) => (s.hidden = k !== i));
    eq.forEach((b, k) => {
      b.classList.toggle("is-done", k < i);
      b.classList.toggle("is-now", k === i);
    });
    count.textContent = `Шаг ${i + 1} из ${steps.length}`;
    nextLabel.textContent = i === steps.length - 1 ? "Отправить заявку" : "Дальше";
    back.disabled = i === 0;
    // на первом шаге кнопок нет: выбор повода сам ведёт дальше
    nav.hidden = i === 0;
    stepTg.forEach((a, k) => (a.hidden = k !== i));
    error.textContent = "";
    if (seenSteps.size && !seenSteps.has(i)) {
      seenSteps.add(i);
      reachGoal(`form_step_${i + 1}` as Goal);
    }
    mic?.setStep(i, steps.length);
    if (!reduced()) gsap.fromTo(steps[i], { opacity: 0, x: 40 * dir }, { opacity: 1, x: 0, duration: 0.5, ease: "expo.out" });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      error.textContent = err;
      if (!reduced()) gsap.fromTo(steps[i], { x: -8 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" });
      return;
    }
    if (i < steps.length - 1) {
      i++;
      save();
      render(1);
      focusStep();
      return;
    }
    // отправка
    const fd = new FormData(form);
    const lead: Lead = {
      date: String(fd.get("date")),
      time: String(fd.get("time")),
      duration: String(fd.get("duration")),
      adults: Number(fd.get("adults")),
      kids: Number(fd.get("kids")),
      place: String(fd.get("place")),
      room: room?.slug,
      roomTitle: room?.title,
      occasion: String(fd.get("occasion")),
      occasionOther: String(fd.get("occasionOther") || ""),
      extras: fd.getAll("extras").map(String),
      name: String(fd.get("name")).trim(),
      phone: String(fd.get("phone")),
      contactWay: String(fd.get("contactWay")),
      source: location.href,
    };
    nextLabel.textContent = "Отправляем…";
    const { ok } = await sendLead(lead);
    if (!ok) {
      nextLabel.textContent = "Отправить заявку";
      error.textContent = "Не получилось отправить. Позвоните нам или напишите в мессенджер — ответим быстро.";
      return;
    }
    try {
      localStorage.removeItem(KEY);
    } catch {}
    steps.forEach((s) => (s.hidden = true));
    nav.hidden = true;
    eq.forEach((b) => b.classList.add("is-done"));
    count.textContent = "Готово";
    success.hidden = false;
    success.focus({ preventScroll: true });
    mic?.celebrate();
    reachGoal("form_submit", { occasion: lead.occasion, place: lead.place });
    stepTg.forEach((a) => (a.hidden = true));
  });
  back.addEventListener("click", () => {
    if (i === 0) return;
    i--;
    save();
    render(-1);
    focusStep();
  });

  // предзаполнение: «Забронировать этот зал» и «Хочу так»
  const prefill = (d: Record<string, unknown>) => {
    if (d.room) setRoom(String(d.room));
    if (d.loc) {
      const r = form.querySelector<HTMLInputElement>(`input[name="place"][value="${d.loc}"]`);
      if (r) r.checked = true;
    }
    if (d.occasion) {
      const r = form.querySelector<HTMLInputElement>(`input[name="occasion"][value="${d.occasion}"]`);
      if (r) r.checked = true;
    }
    toggleOther();
    save();
  };
  addEventListener("pt:prefill", (e) => prefill((e as CustomEvent).detail));
  addEventListener("pt:booking", (e) => prefill((e as CustomEvent).detail));

  restore();
  const qs = new URLSearchParams(location.search);
  if (qs.get("room")) prefill({ room: qs.get("room"), loc: qs.get("loc") });
  // продолжаем с того шага, где человек остановился (прогресс в localStorage)
  try {
    const st = Number(JSON.parse(localStorage.getItem(KEY) || "{}").step || 0);
    if (st > 0 && st < steps.length && occasion()) i = st;
  } catch {}
  render(0);
  // цель «шаг N» — с момента, когда форму увидели
  new IntersectionObserver((en, obs) => {
    if (!en[0].isIntersecting) return;
    obs.disconnect();
    seenSteps.add(i);
    reachGoal(`form_step_${i + 1}` as Goal);
  }, { threshold: 0.3 }).observe(form);

  /* ---------- 3D-микрофон: лениво, когда форма рядом ---------- */
  const io = new IntersectionObserver(
    async (en) => {
      if (!en[0].isIntersecting) {
        mic?.stop();
        return;
      }
      if (!mic) {
        try {
          const { createMic } = await import("./fx/mic3d");
          mic = createMic(canvas, { mobile: matchMedia("(max-width: 767px)").matches, reduced: reduced() });
          mic.setStep(i, steps.length);
          addEventListener("resize", () => mic?.resize());
        } catch {
          canvas.remove();
          return;
        }
      }
      mic.start();
    },
    { rootMargin: "200px" }
  );
  io.observe(canvas);
}
