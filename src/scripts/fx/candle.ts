export function initCandle(photo: HTMLElement) {
  if (!("IntersectionObserver" in window)) return;

  const image = photo.querySelector("img");
  const canvas = photo.querySelector("canvas");
  const ctx = canvas?.getContext("2d");
  if (!image || !canvas || !ctx) return;

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const { width, height } = canvas;
  const sample = document.createElement("canvas");
  sample.width = width;
  sample.height = height;
  const sampleContext = sample.getContext("2d");
  if (!sampleContext) return;

  let visible = false;
  let played = false;
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    photo.removeAttribute("data-flickering");
  };

  const play = () => {
    if (!visible || played || motion.matches || document.hidden || !image.naturalWidth) return;

    // Scale the full srcset image to the reference coordinates and draw only the area around the flame.
    sampleContext.drawImage(image, -337, -376, 768, 868);
    played = true;

    const duration = 4800;
    const start = performance.now();
    let lastFrame = -Infinity;
    const draw = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        stop();
        return;
      }
      if (elapsed - lastFrame >= 32) {
        lastFrame = elapsed;
        const time = elapsed / 1000;
        const fade = Math.min(1, elapsed / 180, (duration - elapsed) / 340);
        const sway = fade * (8 * Math.sin(time * 8.1) + 5 * Math.sin(time * 18.4));
        const stretch = fade * (9 * Math.sin(time * 11.7) + 5 * Math.sin(time * 23.6));
        ctx.clearRect(0, 0, width, height);
        for (let y = 0; y < height; y++) {
          // Keep the flame pinned to the wick and taper the shift above the tip.
          const flex = Math.max(0, 1 - y / 122) * Math.min(1, y / 30);
          const sourceY = Math.min(height - 1, Math.max(0, y + stretch * flex));
          ctx.drawImage(sample, 0, sourceY, width, 1, sway * flex, y, width, 1);
        }
        const reflection = fade * (0.20 + 0.10 * Math.sin(time * 11.7) + 0.06 * Math.sin(time * 19.5));
        photo.style.setProperty("--candle-light", String(reflection));
        photo.setAttribute("data-flickering", "");
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= 0.35;
    if (visible) play();
    else {
      stop();
      played = false;
    }
  }, { threshold: 0.35 }).observe(photo);

  image.addEventListener("load", play);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else play();
  });
  motion.addEventListener("change", () => {
    if (motion.matches) stop();
    else play();
  });
}
