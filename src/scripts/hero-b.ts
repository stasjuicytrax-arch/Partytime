import { gsap } from "gsap";
import SplitType from "split-type";
import { reduced, finePointer, revealPage } from "./motion";
import type { DiscoBall } from "./disco";


export function initHeroB(hero: HTMLElement) {
  const anchor = hero.querySelector<HTMLElement>("[data-ball-anchor]")!;
  const wrap = document.querySelector<HTMLElement>("[data-ball]")!;
  const canvas = wrap.querySelector<HTMLCanvasElement>("canvas")!;
  let ball: DiscoBall | null = null;

  /* ---------- шар: стоит на своём месте в hero и уезжает вместе с ним ---------- */
  let size = 0;
  let visible = true;
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
    wrap.style.transform = `translate3d(${a.left}px, ${a.top}px, 0)`;
    // за пределами экрана не рендерим
    const on = a.bottom > -40 && a.top < innerHeight + 40;
    if (on !== visible) {
      visible = on;
      wrap.style.visibility = on ? "" : "hidden";
      if (ball && !reduced()) (on ? ball.start() : ball.stop());
    }
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
      document.addEventListener("visibilitychange", () => (document.hidden ? ball?.stop() : !reduced() && visible && ball?.start()));
    } catch (err) {
      console.warn("WebGL недоступен — остаётся статичный шар", err);
    }
  };

  /* ---------- «Проверить микрофон»: шар слушает голос (Web Audio, локально) ---------- */
  const micBtn = hero.querySelector<HTMLButtonElement>("[data-mic-check]");
  if (micBtn) {
    const label = hero.querySelector<HTMLElement>("[data-mic-label]")!;
    const status = hero.querySelector<HTMLElement>("[data-mic-status]")!;
    const bars = [...micBtn.querySelectorAll<HTMLElement>(".hb__mic-eq i")];
    let meter: import("./fx/voice").VoiceMeter | null = null;
    let raf = 0;
    let timer = 0;
    const stop = (msg = "") => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      meter?.stop();
      meter = null;
      ball?.setLevel(0);
      bars.forEach((b) => (b.style.transform = ""));
      micBtn.setAttribute("aria-pressed", "false");
      label.textContent = "Проверить микрофон";
      status.textContent = msg;
    };
    const tick = () => {
      if (!meter) return;
      const { level, bands } = meter.read();
      bars.forEach((b, i) => (b.style.transform = `scaleY(${0.2 + bands[i * 3] * 0.8})`));
      if (!reduced()) ball?.setLevel(level);
      raf = requestAnimationFrame(tick);
    };
    micBtn.addEventListener("click", async () => {
      if (meter) return stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        status.textContent = "Браузер не умеет слушать микрофон.";
        return;
      }
      status.textContent = "Разрешите доступ к микрофону…";
      try {
        const { startVoiceMeter } = await import("./fx/voice");
        meter = await startVoiceMeter(16);
        micBtn.setAttribute("aria-pressed", "true");
        label.textContent = "Выключить микрофон";
        status.textContent = "Пойте! Звук никуда не отправляется.";
        tick();
        timer = window.setTimeout(() => stop("Минута прошла — микрофон выключен."), 60000);
      } catch (e) {
        status.textContent = (e as DOMException)?.name === "NotAllowedError" ? "Доступ не дали — ничего страшного." : "Не получилось включить микрофон.";
      }
    });
    document.addEventListener("visibilitychange", () => document.hidden && meter && stop());
    // уехали с первого экрана — выключаем
    new IntersectionObserver((en) => !en[0].isIntersecting && meter && stop()).observe(hero);
  }

  /* ---------- интро ---------- */
  const lines = [...hero.querySelectorAll<HTMLElement>("[data-split]")];
  // телефон / слабое железо: заголовок и текст видны сразу, шар — когда браузер освободится
  const light = matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const whenIdle = (fn: () => void) => {
    const go = () => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
    document.readyState === "complete" ? go() : addEventListener("load", go, { once: true });
  };
  if (reduced() || light) {
    revealPage();
    hero.classList.add("is-on");
    whenIdle(loadBall);
    if (!reduced()) {
      gsap.from(hero.querySelectorAll(".hb__fact"), { y: 24, duration: 0.8, ease: "expo.out", stagger: 0.08, delay: 0.2 });
    }
    return;
  }

  const h1 = hero.querySelector("h1");
  h1?.setAttribute("aria-label", (h1.textContent || "").replace(/\s+/g, " ").trim());
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
    .from(facts, { y: 40, opacity: 0, scale: 0.9, duration: 0.9, ease: "expo.out", stagger: 0.1 }, 0.9);

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

  // стеклянные карточки чуть смещаются от курсора — глубина вокруг шара
  if (finePointer()) {
    const fx = facts.map((f) => gsap.quickTo(f, "x", { duration: 1.2, ease: "power3.out" }));
    hero.addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      fx.forEach((q, i) => q(nx * (i % 2 ? -22 : 22)));
    });
  }
}
