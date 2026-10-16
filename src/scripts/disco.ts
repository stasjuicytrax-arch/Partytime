// Диско-шар на Three.js: зеркальные грани (InstancedMesh), отражения в цветах палитры
// через PMREM-окружение из цветных «софитов», вращение и реакция на курсор.
import * as THREE from "three";
import { makeClubEnv } from "./fx/club-env";

export interface DiscoBall {
  setPointer(x: number, y: number): void;
  powerOn(duration?: number): void;
  resize(): void;
  setSpin(mult: number): void;
  /** 0..1 — громкость с микрофона: шар пульсирует, вспыхивает и ускоряется */
  setLevel(v: number): void;
  renderOnce(): void;
  start(): void;
  stop(): void;
}

const PALETTE = { pink: 0xfe76b4, violet: 0x7659ff, sky: 0x6cd0f0, lime: 0xc9e543, white: 0xffffff, coral: 0xfa3e35 };

export function createDiscoBall(canvas: HTMLCanvasElement, opts: { mobile?: boolean } = {}): DiscoBall {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 4.6);

  /* ---------- окружение: тёмный зал, усыпанный цветными огнями ----------
     Процедурная equirect-текстура: много мелких пятен разного цвета, чтобы каждая
     грань ловила свой блик, плюс пара мощных белых софитов. */
  const envTex = makeClubEnv(renderer, 11, opts.mobile ? 0.5 : 1);
  scene.environment = envTex;

  /* ---------- шар: кольца квадратных зеркал ---------- */
  const rings = opts.mobile ? 24 : 32;
  const tile = (Math.PI / rings) * 0.9;
  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < rings; i++) {
    const phi = ((i + 0.5) / rings) * Math.PI;
    const r = Math.sin(phi);
    const y = Math.cos(phi);
    const n = Math.max(6, Math.round((2 * Math.PI * r) / (Math.PI / rings)));
    for (let j = 0; j < n; j++) {
      const th = (j / n) * Math.PI * 2 + (i % 2) * (Math.PI / n);
      positions.push(new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th)));
    }
  }
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, envMapIntensity: 0 });
  const mirrors = new THREE.InstancedMesh(new THREE.BoxGeometry(tile, tile, 0.012), mirrorMat, positions.length);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  positions.forEach((p, k) => {
    dummy.position.copy(p);
    dummy.lookAt(p.clone().multiplyScalar(2));
    dummy.rotateX((Math.random() - 0.5) * 0.22);
    dummy.rotateY((Math.random() - 0.5) * 0.22);
    dummy.updateMatrix();
    mirrors.setMatrixAt(k, dummy.matrix);
    const t = Math.random();
    tint.setRGB(0.82 + 0.18 * Math.random(), 0.82 + 0.18 * Math.random(), 0.86 + 0.14 * Math.random());
    if (t > 0.94) tint.set(PALETTE.pink).lerp(new THREE.Color(0xffffff), 0.45);
    else if (t > 0.88) tint.set(PALETTE.sky).lerp(new THREE.Color(0xffffff), 0.45);
    mirrors.setColorAt(k, tint);
  });
  mirrors.instanceMatrix.needsUpdate = true;

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.985, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.7, metalness: 0.2 })
  );
  const ball = new THREE.Group();
  ball.add(core, mirrors);
  const tilt = new THREE.Group();
  tilt.add(ball);
  tilt.rotation.z = 0.18;
  scene.add(tilt);

  /* ---------- цветные огни: блики по граням ---------- */
  const lights = [
    new THREE.PointLight(PALETTE.pink, 0, 12, 1.4),
    new THREE.PointLight(PALETTE.sky, 0, 12, 1.4),
    new THREE.PointLight(PALETTE.violet, 0, 12, 1.4),
    new THREE.PointLight(0xffffff, 0, 12, 1.4),
  ];
  lights.forEach((l) => scene.add(l));
  const lightPower = [26, 22, 26, 34];

  /* ---------- состояние ---------- */
  let power = 0;
  let powerTarget = 0;
  let powerSpeed = 1;
  let spin = 0.32;
  let spinMult = 1;
  let level = 0;
  let levelS = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0;
  let running = false;
  let last = performance.now();
  let t = 0;

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    power += (powerTarget - power) * Math.min(1, dt * 3 * powerSpeed);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);

    levelS += (level - levelS) * Math.min(1, dt * 12);
    ball.rotation.y += dt * spin * (spinMult + levelS * 6) * (0.35 + power * 0.65);
    ball.scale.setScalar(1 + levelS * 0.12);
    tilt.rotation.x = pointer.y * 0.35;
    tilt.rotation.y = pointer.x * 0.45;

    mirrorMat.envMapIntensity = 0.2 + power * 2.1 + levelS * 2.4;
    lights.forEach((l, i) => {
      const a = t * (0.5 + i * 0.17) + (i * Math.PI) / 2;
      l.position.set(Math.cos(a) * 2.6, Math.sin(a * 0.8) * 1.6 + (i - 1.5) * 0.4, 2.2 + Math.sin(a) * 0.6);
      l.intensity = lightPower[i] * (power + levelS * 2.5);
    });
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  resize();
  renderer.render(scene, camera);

  return {
    setPointer(x, y) {
      pointer.tx = x;
      pointer.ty = y;
    },
    powerOn(duration = 1.2) {
      powerTarget = 1;
      powerSpeed = 1.2 / duration;
    },
    resize,
    setLevel(v) {
      level = Math.max(0, Math.min(1, v));
    },
    setSpin(mult) {
      spinMult = mult;
    },
    renderOnce() {
      power = powerTarget = 1;
      frame(performance.now());
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
