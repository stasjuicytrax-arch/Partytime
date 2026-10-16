// «Зайчики» от диско-шара: световые пятна ползут по секциям ниже hero.
// Один fixed 2D-canvas (не WebGL), режим screen, спрайты пятен заранее отрисованы.
// Вращение «шара» = время + прокрутка: при скролле пятна ускоряются и вытягиваются.
import { reduced } from "../motion";

const COLORS = ["#FFFFFF", "#FE76B4", "#6CD0F0", "#A693FF", "#C9E543", "#FFFFFF", "#FFC548"];

interface Fleck {
  a: number; // угол на «окружности отражения»
  r: number; // радиус орбиты (доля диагонали экрана)
  y: number; // вертикальное смещение орбиты
  s: number; // размер
  c: number; // индекс цвета
  tw: number; // фаза мерцания
}

export interface Flecks {
  start(): void;
  stop(): void;
  destroy(): void;
}

function sprite(color: string, size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, color);
  gr.addColorStop(0.25, color);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}

/**
 * @param zone элемент, внутри которого (по вертикали) видны зайчики; null — весь документ
 */
export function createFlecks(opts: { zone?: HTMLElement | null; mobile?: boolean } = {}): Flecks {
  const mobile = opts.mobile ?? matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "flecks";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "3",
    pointerEvents: "none",
    mixBlendMode: "screen",
    opacity: "0",
    transition: "opacity .6s",
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d")!;
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5);
  const sprites = COLORS.map((c) => sprite(c));

  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const count = mobile ? 16 : 38;
  const flecks: Fleck[] = Array.from({ length: count }, (_, i) => ({
    a: rnd() * Math.PI * 2,
    r: 0.25 + rnd() * 0.75,
    y: rnd() * 2 - 1,
    s: 0.6 + rnd() * 1.3,
    c: i % COLORS.length,
    tw: rnd() * Math.PI * 2,
  }));

  let W = 0, H = 0;
  const resize = () => {
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };
  resize();
  addEventListener("resize", resize);

  let raf = 0;
  let running = false;
  let rot = 0;
  let lastY = scrollY;
  let vel = 0;
  let last = performance.now();
  let frameSkip = 0;

  function visibleAmount() {
    if (!opts.zone) return 1;
    const r = opts.zone.getBoundingClientRect();
    // плавное появление на входе/выходе зоны
    const inTop = Math.min(1, Math.max(0, (H - r.top) / (H * 0.5)));
    const inBottom = Math.min(1, Math.max(0, r.bottom / (H * 0.5)));
    return Math.min(inTop, inBottom);
  }

  function draw(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dy = scrollY - lastY;
    lastY = scrollY;
    vel += (dy / Math.max(dt, 0.001) - vel) * 0.12; // px/s, сглажено
    rot += dt * 0.12 + dy * 0.0016;

    const vis = visibleAmount();
    canvas.style.opacity = String(vis * 0.9);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (vis <= 0.01) return;

    const cx = W * 0.5;
    const cy = H * 0.5;
    const R = Math.hypot(W, H) * 0.62;
    const stretch = 1 + Math.min(3, Math.abs(vel) / 900);
    for (const f of flecks) {
      const ang = f.a + rot * (0.6 + f.r * 0.6);
      const x = cx + Math.cos(ang) * R * f.r;
      const y = cy + f.y * H * 0.55 + Math.sin(ang * 0.7) * H * 0.25;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      const tw = 0.55 + 0.45 * Math.sin(now / 420 + f.tw);
      const w = 42 * f.s;
      const h = 24 * f.s;
      g.save();
      g.translate(x, y);
      // пятно вытянуто по касательной к «вращению» и сильнее — по скорости скролла
      g.rotate(ang + Math.PI / 2 + 0.4);
      g.globalAlpha = tw;
      g.drawImage(sprites[f.c], (-w * stretch) / 2, -h / 2, w * stretch, h);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  function loop(now: number) {
    if (!running) return;
    // на мобильных — 30 fps
    if (!mobile || (frameSkip ^= 1)) draw(now);
    raf = requestAnimationFrame(loop);
  }

  const api: Flecks = {
    start() {
      if (running) return;
      if (reduced()) {
        // статичная картинка без движения
        draw(performance.now());
        return;
      }
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    destroy() {
      api.stop();
      removeEventListener("resize", resize);
      canvas.remove();
    },
  };
  document.addEventListener("visibilitychange", () => (document.hidden ? api.stop() : api.start()));
  return api;
}
