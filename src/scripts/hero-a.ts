import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { reduced, finePointer, revealPage } from "./motion";

gsap.registerPlugin(Draggable, ScrollTrigger);

export function initHeroA(hero: HTMLElement) {
  const q = <T extends Element = HTMLElement>(s: string) => [...hero.querySelectorAll<T>(s)] as T[];

  // дудл: готовим длину штриха
  const paths = q<SVGPathElement>("[data-draw] path");
  paths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = reduced() ? "0" : `${len}`;
  });

  if (reduced()) {
    revealPage();
    return;
  }

  /* ---------- сборка коллажа ---------- */
  const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.1 });
  gsap.set(q("[data-intro]"), { visibility: "visible" });
  revealPage();

  tl.from(q("[data-intro='line']"), { yPercent: 70, opacity: 0, clipPath: "inset(0 0 100% 0)", duration: 0.9, stagger: 0.08 }, 0)
    .from(hero.querySelector(".ha__brush"), { scaleX: 0, transformOrigin: "0% 50%", duration: 0.7, ease: "power4.inOut" }, 0.35)
    .from(q("[data-intro='plate']"), { scale: 0.4, rotate: (i) => (i % 2 ? -24 : 22), opacity: 0, duration: 0.75, ease: "back.out(1.7)", stagger: 0.12 }, 0.3)
    .from(q("[data-intro='cut']"), { y: 140, rotate: (i) => (i % 2 ? 8 : -8), opacity: 0, duration: 0.9, ease: "back.out(1.5)", stagger: 0.14 }, 0.45)
    .from(q("[data-intro='pop']"), { scale: 0, rotate: () => gsap.utils.random(-50, 50), duration: 0.6, ease: "back.out(2.2)", stagger: 0.06 }, 0.75)
    .from(q("[data-intro='fade']"), { y: 24, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.6)
    .to(paths, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.25 }, 1.0);

  /* ---------- лёгкое парение вырезок ---------- */
  q(".ha__cut").forEach((el, i) => {
    gsap.to(el.querySelector("img"), { y: i % 2 ? -10 : -14, rotate: i % 2 ? 1.2 : -1, duration: 3.4 + i, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 });
  });

  /* ---------- параллакс слоёв от мыши ---------- */
  // перетаскиваемые стикеры не параллаксим: их x/y принадлежат Draggable
  const layers = q("[data-depth]:not([data-drag])");
  if (finePointer()) {
    const movers = layers.map((el) => ({
      d: Number(el.dataset.depth),
      x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }),
    }));
    hero.addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      movers.forEach((m) => {
        m.x(nx * 34 * m.d);
        m.y(ny * 22 * m.d);
      });
    });
  }

  /* ---------- стикеры можно таскать ---------- */
  tl.eventCallback("onComplete", () => {
    if (!finePointer()) return;
    Draggable.create(q("[data-drag]"), {
      type: "x,y",
      bounds: hero,
      zIndexBoost: false,
      onPress() {
        gsap.to(this.target, { scale: 1.12, duration: 0.2, ease: "power2.out" });
      },
      onRelease() {
        gsap.to(this.target, { scale: 1, duration: 0.45, ease: "back.out(3)" });
      },
    });
  });

  /* ---------- скролл: коллаж разъезжается ---------- */
  gsap.to(q(".ha__cut--singers, .ha__plate--singers"), {
    yPercent: -12,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
  });
}
