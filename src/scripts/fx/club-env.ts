// Окружение «тёмный зал с цветными софитами» для зеркальных и хромированных материалов.
// Процедурная equirect-текстура: много мелких пятен палитры, чтобы каждая грань/изгиб ловили свой блик.
import * as THREE from "three";

/** scale < 1 — уменьшенная текстура для телефонов (меньше работы для PMREM) */
export function makeClubEnv(renderer: THREE.WebGLRenderer, seed = 11, scale = 1): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = document.createElement("canvas");
  env.width = Math.round(1024 * scale);
  env.height = Math.round(512 * scale);
  const g = env.getContext("2d")!;
  g.scale(scale, scale);
  const bg = g.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, "#1d1636");
  bg.addColorStop(0.5, "#120f1c");
  bg.addColorStop(1, "#08080a");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 512);
  const cols = ["#FE76B4", "#7659FF", "#6CD0F0", "#C9E543", "#FFFFFF", "#FA3E35", "#A693FF", "#FFC548"];
  let sd = seed;
  const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const spot = (x: number, y: number, rad: number, col: string, a = 1) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, col);
    gr.addColorStop(0.35, col);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = a;
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  };
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) spot(r() * 1024, 80 + r() * 300, 60 + r() * 90, cols[i % 4], 0.35);
  for (let i = 0; i < 220; i++) spot(r() * 1024, r() * 512, 4 + r() * 16, cols[Math.floor(r() * cols.length)], 0.9);
  spot(300, 110, 46, "#FFFFFF", 1);
  spot(760, 150, 30, "#FFFFFF", 1);
  spot(540, 70, 22, "#FFFFFF", 1);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  const envMap = new THREE.CanvasTexture(env);
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.colorSpace = THREE.SRGBColorSpace;
  const envTex = pmrem.fromEquirectangular(envMap).texture;
  envMap.dispose();
  pmrem.dispose();
  return envTex;
}
