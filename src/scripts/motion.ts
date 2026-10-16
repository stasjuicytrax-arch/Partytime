import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const rm = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
export const reduced = () => !!rm?.matches;
export const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

let _lenis: Lenis | null = null;
export const lenis = () => _lenis;

/** Плавный скролл Lenis, синхронизированный с ScrollTrigger */
export function initSmoothScroll() {
  if (reduced() || _lenis) return _lenis;
  _lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: { offset: -24 } });
  _lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => _lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return _lenis;
}

/** Снимает «занавес» до старта интро (класс ставится инлайн-скриптом в <head>) */
export function revealPage() {
  document.documentElement.classList.remove("is-intro");
}

/** Магнитные кнопки: смещение к курсору ≤ 8px */
export function initMagnetic(selector = "[data-magnetic]") {
  if (reduced() || !finePointer()) return;
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const x = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x(((e.clientX - r.left) / r.width - 0.5) * 16);
      y(((e.clientY - r.top) / r.height - 0.5) * 16);
    });
    el.addEventListener("pointerleave", () => {
      x(0);
      y(0);
    });
  });
}

/** Кастомный курсор: кружок; над карточкой зала — «СМОТРЕТЬ» */
export function initCursor() {
  if (reduced() || !finePointer()) return;
  const c = document.createElement("div");
  c.className = "cursor";
  c.setAttribute("aria-hidden", "true");
  c.innerHTML = '<span class="cursor__label">Смотреть</span>';
  document.body.appendChild(c);
  document.documentElement.classList.add("has-cursor");
  const x = gsap.quickTo(c, "x", { duration: 0.18, ease: "power3.out" });
  const y = gsap.quickTo(c, "y", { duration: 0.18, ease: "power3.out" });
  let shown = false;
  window.addEventListener("pointermove", (e) => {
    x(e.clientX);
    y(e.clientY);
    if (!shown) {
      shown = true;
      c.classList.add("is-on");
    }
    const t = e.target as HTMLElement;
    c.classList.toggle("is-view", !!t.closest?.(".card__link"));
    c.classList.toggle("is-cta", !t.closest?.(".card__link") && !!t.closest?.("a, button, [data-drag]"));
  }, { passive: true });
  document.addEventListener("pointerleave", () => c.classList.remove("is-on"));
  document.addEventListener("pointerenter", () => c.classList.add("is-on"));
}

/** Бегущая строка: скорость растёт от скорости скролла */
export function initMarquee(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-marquee]").forEach((row) => {
    const track = row.querySelector<HTMLElement>(".marquee__track")!;
    const dir = row.dataset.dir === "right" ? 1 : -1;
    if (reduced()) return;
    const tween = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: Number(row.dataset.speed || 28), ease: "none", repeat: -1 });
    let boost = 1;
    ScrollTrigger.create({
      trigger: row,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        boost = 1 + Math.min(1.5, Math.abs(self.getVelocity()) / 1500);
      },
    });
    gsap.ticker.add(() => {
      const ts = tween.timeScale();
      tween.timeScale(ts + (boost - ts) * 0.08);
      boost += (1 - boost) * 0.04;
    });
  });
}
