import { gsap } from "gsap";
import SplitType from "split-type";
import { reduced, finePointer, revealPage } from "./motion";
import type { DiscoBall } from "./disco";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export function initHeroB(hero: HTMLElement) {
  const anchor = hero.querySelector<HTMLElement>("[data-ball-anchor]")!;
  const slot = document.querySelector<HTMLElement>("[data-ball-slot]");
  const wrap = document.querySelector<HTMLElement>("[data-ball]")!;
  const canvas = wrap.querySelector<HTMLCanvasElement>("canvas")!;
  let ball: DiscoBall | null = null;

  /* ---------- шапка: стекло после прокрутки ---------- */

  /* ---------- шар: из hero в шапку ---------- */
  let size = 0;
  function layoutBall() {
    const a = anchor.getBoundingClientRect();
    if (Math.abs(a.width - size) > 1) {
      size = a.width;
      wrap.style.width = wrap.style.height = `${size}px`;
      ball?.resize();
    }
  }
  function placeBall() {
    const a = anchor.getBoundingClientRect();
    const end = hero.offsetHeight * 0.75;
    const p = smooth(Math.min(1, Math.max(0, scrollY / end)));
    let cx = a.left + a.width / 2;
    let cy = a.top + a.height / 2;
    let d = a.width;
    if (slot && slot.offsetParent !== null) {
      const s = slot.getBoundingClientRect();
      cx = lerp(a.left + a.width / 2, s.left + s.width / 2, p);
      cy = lerp(a.top + a.height / 2, s.top + s.height / 2, p);
      d = lerp(a.width, s.width, p);
    } else {
      // на мобильном шапка без слота: шар просто уезжает с hero
    }
    const k = d / size;
    wrap.style.transform = `translate3d(${cx - d / 2}px, ${cy - d / 2}px, 0) scale(${k})`;
    wrap.style.setProperty("--glow", String(1 - p * 0.85));
    // в hero шар под лицевой строкой, у шапки — поверх неё
    wrap.classList.toggle("is-docked", p > 0.6);
    ball?.setSpin(1 + p * 1.5);
  }
  layoutBall();
  placeBall();
  addEventListener("scroll", placeBall, { passive: true });
  addEventListener("resize", () => {
    layoutBall();
    placeBall();
  });
  gsap.ticker.add(placeBall);

  /* ---------- пасхалка: режим вечеринки 3 с ---------- */
  const party = () => {
    if (reduced() || document.documentElement.classList.contains("party")) return;
    document.documentElement.classList.add("party");
    ball?.setSpin(6);
    setTimeout(() => {
      document.documentElement.classList.remove("party");
      ball?.setSpin(1);
    }, 3000);
  };
  anchor.addEventListener("click", party);
  slot?.addEventListener("click", party);
  document.querySelector(".hdr--b [data-party]")?.addEventListener("click", (e) => {
    {
      e.preventDefault();
      party();
    }
  });

  /* ---------- Three.js: лениво, после первого кадра ---------- */
  const loadBall = async () => {
    try {
      const { createDiscoBall } = await import("./disco");
      ball = createDiscoBall(canvas, { mobile: innerWidth < 768 });
      layoutBall();
      ball.resize();
      document.documentElement.classList.add("ball-ready");
      if (reduced()) {
        ball.renderOnce();
      } else {
        ball.start();
        ball.powerOn(1.4);
      }
      if (finePointer() && !reduced()) {
        addEventListener("pointermove", (e) => ball?.setPointer(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5), { passive: true });
      }
      document.addEventListener("visibilitychange", () => (document.hidden ? ball?.stop() : !reduced() && ball?.start()));
    } catch (err) {
      console.warn("WebGL недоступен — остаётся статичный шар", err);
    }
  };

  /* ---------- интро ---------- */
  const lines = [...hero.querySelectorAll<HTMLElement>("[data-split]")];
  if (reduced()) {
    revealPage();
    hero.classList.add("is-on");
    loadBall();
    return;
  }

  const h1 = hero.querySelector("h1");
  h1?.setAttribute("aria-label", (h1.textContent || "").replace(/s+/g, " ").trim());
  lines.forEach((l) => l.setAttribute("aria-hidden", "true"));
  const split = lines.map((l) => new SplitType(l, { types: "chars", tagName: "span" }));
  const chars = split.flatMap((s) => s.chars ?? []);
  const flash = hero.querySelector<HTMLElement>("[data-flash]")!;
  const facts = [...hero.querySelectorAll<HTMLElement>(".hb__fact")];

  gsap.set(wrap, { opacity: 0 });
  revealPage();
  requestAnimationFrame(() => loadBall());

  const tl = gsap.timeline({ delay: 0.15 });
  tl.set(lines, { visibility: "visible" })
    .from(chars, {
      x: () => gsap.utils.random(-420, 420),
      y: () => gsap.utils.random(-260, 260),
      rotate: () => gsap.utils.random(-120, 120),
      scale: () => gsap.utils.random(0.2, 1.8),
      opacity: 0,
      duration: 1.2,
      ease: "expo.out",
      stagger: { each: 0.035, from: "random" },
    }, 0)
    // одна вспышка света — шар «включается»
    .to(flash, { opacity: 0.85, duration: 0.08, ease: "power1.in" }, 0.55)
    .add(() => hero.classList.add("is-on"), 0.6)
    .to(flash, { opacity: 0, duration: 0.7, ease: "power2.out" }, 0.63)
    .fromTo(wrap, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55)
    .from(canvas, { scale: 0.3, rotate: -40, duration: 1.4, ease: "back.out(1.4)" }, 0.55)
    .from(facts, { y: 40, opacity: 0, scale: 0.9, duration: 0.9, ease: "expo.out", stagger: 0.1 }, 0.9)
    .from(hero.querySelectorAll("[data-intro-b]"), { y: 28, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.08 }, 1.0);
  gsap.set(hero.querySelectorAll("[data-intro-b]"), { visibility: "visible" });

  // счётчик «36»
  hero.querySelectorAll<HTMLElement>("[data-count-to]").forEach((el) => {
    const to = Number(el.dataset.countTo);
    const o = { v: 0 };
    tl.to(o, { v: to, duration: 1.4, ease: "power3.out", onUpdate: () => (el.textContent = String(Math.round(o.v))) }, 1.0);
  });

  // парение стеклянных карточек
  facts.forEach((f, i) => {
    gsap.to(f, { y: i % 2 ? 14 : -14, duration: 3.2 + i * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2 + i * 0.2 });
  });

  // параллакс пятен и гостей от курсора
  if (finePointer()) {
    const guests = [...hero.querySelectorAll<HTMLElement>(".hb__guest")];
    const gx = guests.map((g) => gsap.quickTo(g, "x", { duration: 1.2, ease: "power3.out" }));
    hero.addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      gx.forEach((q, i) => q(nx * (i ? -26 : 26)));
    });
  }
}
