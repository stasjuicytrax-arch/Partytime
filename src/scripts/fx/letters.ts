// Падающие буквы «PARTY TIME» в подвале: физика matter-js, буквы — обычные DOM-элементы
// (текст остаётся текстом). Падают, когда подвал попадает в экран; курсор их расталкивает,
// мышью можно схватить и бросить, на таче — тап «взрывает» кучу.
// Без анимации — буквы просто стоят словом.
import { reduced } from "../motion";

export async function initLetters(stage: HTMLElement) {
  const letters = [...stage.querySelectorAll<HTMLElement>("[data-letter]")];
  if (!letters.length) return;
  if (reduced()) {
    stage.classList.add("is-static");
    return;
  }

  const Matter = (await import("matter-js")).default;
  const { Engine, Bodies, Composite, Body, Mouse, MouseConstraint, Events } = Matter;

  const engine = Engine.create({ gravity: { x: 0, y: 1.1 } });
  let W = stage.clientWidth;
  let H = stage.clientHeight;
  const walls: Matter.Body[] = [];
  const makeWalls = () => {
    walls.forEach((w) => Composite.remove(engine.world, w));
    walls.length = 0;
    const T = 200;
    walls.push(
      Bodies.rectangle(W / 2, H + T / 2, W * 3, T, { isStatic: true }),
      Bodies.rectangle(-T / 2, H / 2, T, H * 4, { isStatic: true }),
      Bodies.rectangle(W + T / 2, H / 2, T, H * 4, { isStatic: true })
    );
    Composite.add(engine.world, walls);
  };
  makeWalls();

  // буквы ставим «словом» над сценой и роняем с лёгким разбросом
  stage.classList.add("is-physics");
  const bodies = letters.map((el, i) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = (W / (letters.length + 1)) * (i + 1);
    const b = Bodies.rectangle(x, -h - i * 70 - Math.random() * 120, w * 0.92, h * 0.78, {
      restitution: 0.35,
      friction: 0.4,
      frictionAir: 0.012,
      chamfer: { radius: Math.min(w, h) * 0.12 },
      angle: (Math.random() - 0.5) * 0.6,
    });
    return { el, b, w, h };
  });
  Composite.add(engine.world, bodies.map((x) => x.b));

  // мышь: хватать и бросать
  const mouse = Mouse.create(stage);
  // колесо мыши не перехватываем — страница должна скроллиться
  const mw = (mouse as unknown as { mousewheel: EventListener }).mousewheel;
  stage.removeEventListener("wheel", mw);
  stage.removeEventListener("mousewheel", mw);
  stage.removeEventListener("DOMMouseScroll", mw);
  const mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } as Matter.Constraint });
  Composite.add(engine.world, mc);

  // курсор расталкивает буквы
  let px = -9999, py = -9999;
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
  });
  stage.addEventListener("pointerleave", () => (px = py = -9999));
  Events.on(engine, "beforeUpdate", () => {
    if (px < -1000) return;
    for (const { b } of bodies) {
      const dx = b.position.x - px, dy = b.position.y - py;
      const d = Math.hypot(dx, dy);
      if (d < 150 && d > 1) {
        const f = (1 - d / 150) * 0.045 * b.mass;
        Body.applyForce(b, b.position, { x: (dx / d) * f, y: (dy / d) * f - 0.01 * b.mass });
      }
    }
  });
  // тап на таче — «взрыв» от точки касания
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (const { b } of bodies) {
      const dx = b.position.x - x, dy = b.position.y - y;
      const d = Math.max(30, Math.hypot(dx, dy));
      const f = Math.min(0.25, 40 / d) * b.mass * 0.06;
      Body.applyForce(b, b.position, { x: (dx / d) * f, y: -Math.abs(f) * 1.2 });
    }
  });

  let raf = 0;
  let running = false;
  let last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(1000 / 30, now - last);
    last = now;
    Engine.update(engine, dt);
    for (const { el, b, w, h } of bodies) {
      el.style.transform = `translate(${b.position.x - w / 2}px, ${b.position.y - h / 2}px) rotate(${b.angle}rad)`;
    }
    if (running) raf = requestAnimationFrame(step);
  };
  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(step);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // работаем только пока подвал в экране
  new IntersectionObserver((en) => (en[0].isIntersecting ? start() : stop()), { threshold: 0.05 }).observe(stage);
  addEventListener("resize", () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    makeWalls();
  });
}
