import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { reduced, lenis } from "./motion";

gsap.registerPlugin(ScrollTrigger);

/** Плавный переход к форме с выбранными параметрами */
export function goToBooking(patch: Record<string, unknown>) {
  try {
    const saved = JSON.parse(localStorage.getItem("pt:booking") || "{}");
    localStorage.setItem("pt:booking", JSON.stringify({ ...saved, ...patch }));
  } catch {}
  window.dispatchEvent(new CustomEvent("pt:prefill", { detail: patch }));
  const target = document.getElementById("booking");
  if (!target) return;
  const l = lenis();
  if (l) l.scrollTo(target, { offset: -20 });
  else target.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
}

/* ---------- появление блоков ---------- */
export function initReveals() {
  if (reduced()) return;
  document.documentElement.classList.add("js-reveal");
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, translate: "0 0px", duration: 0.9, ease: "expo.out", stagger: 0.08 }),
  });
}

/* ---------- 02: часы 00:00 → 06:00 ---------- */
export function initClock() {
  const el = document.querySelector<HTMLElement>("[data-clock]");
  if (!el || reduced()) return;
  const o = { m: 0 };
  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    once: true,
    onEnter: () =>
      gsap.to(o, {
        m: 360,
        duration: 1.8,
        ease: "power3.out",
        onUpdate: () => {
          const h = Math.floor(o.m / 60), m = Math.floor(o.m % 60);
          el.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        },
      }),
  });
  el.textContent = "00:00";
}

/* ---------- 04: раскрывающиеся панели сервисов ---------- */
export function initServices() {
  const items = [...document.querySelectorAll<HTMLElement>("[data-svc]")];
  const desktop = () => matchMedia("(min-width: 1024px)").matches;
  const open = (it: HTMLElement) => {
    items.forEach((x) => {
      const on = x === it ? (desktop() ? true : !x.hasAttribute("data-open")) : false;
      x.toggleAttribute("data-open", on);
      x.querySelector(".svc__head")!.setAttribute("aria-expanded", String(on));
    });
  };
  items.forEach((it) => {
    it.querySelector<HTMLButtonElement>(".svc__head")!.addEventListener("click", () => open(it));
    // на десктопе панель раскрывается и по наведению мыши
    it.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse" && desktop() && !it.hasAttribute("data-open")) open(it);
    });
  });
}

/* ---------- 08: FAQ — плавная высота ---------- */
export function initFaq() {
  document.querySelectorAll<HTMLDetailsElement>("[data-qa]").forEach((d) => {
    const sum = d.querySelector("summary")!;
    const body = d.querySelector<HTMLElement>(".qa__body")!;
    sum.addEventListener("click", (e) => {
      if (reduced()) return;
      e.preventDefault();
      if (d.open) {
        gsap.fromTo(body, { height: body.offsetHeight }, { height: 0, duration: 0.35, ease: "power2.inOut", onComplete: () => { d.open = false; gsap.set(body, { clearProps: "height" }); } });
      } else {
        d.open = true;
        gsap.fromTo(body, { height: 0 }, { height: body.scrollHeight, duration: 0.45, ease: "expo.out", onComplete: () => gsap.set(body, { clearProps: "height" }) });
      }
    });
  });
}

/* ---------- 05: купоны переворачиваются по тапу ---------- */
export function initCoupons() {
  document.querySelectorAll<HTMLButtonElement>("[data-coupon]").forEach((b) =>
    b.addEventListener("click", () => b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"))
  );
}

/* ---------- 03: горизонтальная лента форматов ---------- */
export function initFormats() {
  const sec = document.querySelector<HTMLElement>("[data-formats]");
  if (!sec) return;
  const pin = sec.querySelector<HTMLElement>("[data-formats-pin]")!;
  const track = sec.querySelector<HTMLElement>("[data-formats-track]")!;
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1280px) and (prefers-reduced-motion: no-preference)", () => {
    sec.classList.add("is-pinned");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tw = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: { trigger: pin, start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    // карточки слегка «разворачиваются» при въезде
    gsap.utils.toArray<HTMLElement>(".fcard").forEach((c) => {
      gsap.from(c, { rotate: 4, y: 40, opacity: 0.4, ease: "none", scrollTrigger: { trigger: c, containerAnimation: tw, start: "left 100%", end: "left 60%", scrub: true } });
    });
    return () => sec.classList.remove("is-pinned");
  });

  // «Хочу так» → поле «Повод» в форме
  sec.querySelectorAll<HTMLButtonElement>("[data-format]").forEach((b) =>
    b.addEventListener("click", () => {
      sec.querySelectorAll(".is-picked").forEach((x) => x.classList.remove("is-picked"));
      b.classList.add("is-picked");
      goToBooking({ occasion: b.dataset.format, formatTitle: b.dataset.formatTitle });
    })
  );
}
