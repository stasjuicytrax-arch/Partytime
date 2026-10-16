// Хромированный 3D-микрофон для пошаговой формы: поворачивается на каждом шаге,
// на успехе — взрыв 3D-конфетти в цветах палитры. Лениво импортируется вместе с three.
import * as THREE from "three";
import { makeClubEnv } from "./club-env";

export interface Mic3D {
  setStep(i: number, total: number): void;
  celebrate(): void;
  resize(): void;
  start(): void;
  stop(): void;
}

const PALETTE = [0xfe76b4, 0x7659ff, 0x6cd0f0, 0xc9e543, 0xffc548, 0xfa3e35, 0xffffff];

/** Сетка-гриль: тёмные «дырочки» в alpha, чтобы сквозь хром была видна тёмная сердцевина */
function grilleTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#000";
  const step = 11;
  for (let y = 0; y < 256; y += step * 0.86) {
    const row = Math.round(y / (step * 0.86));
    for (let x = (row % 2) * (step / 2); x < 512; x += step) {
      g.beginPath();
      g.arc(x, y, step * 0.33, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

export function createMic(canvas: HTMLCanvasElement, opts: { mobile?: boolean; reduced?: boolean } = {}): Mic3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, opts.mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.environment = makeClubEnv(renderer, 29);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.1, 9.2);

  /* ---------- микрофон ---------- */
  const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f2f6, metalness: 1, roughness: 0.12, envMapIntensity: 1.6 });
  const darkChrome = new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 1, roughness: 0.25, envMapIntensity: 1.2 });
  const lime = new THREE.MeshStandardMaterial({ color: 0xc9e543, metalness: 0.35, roughness: 0.3, emissive: 0x3a4a00, emissiveIntensity: 0.4 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xfe76b4, metalness: 0.35, roughness: 0.3 });

  const mic = new THREE.Group();
  // головка: хромированная сетка + тёмное ядро
  const grille = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 64, 48),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.2, envMapIntensity: 1.8, alphaMap: grilleTexture(), transparent: false, alphaTest: 0.5, side: THREE.DoubleSide })
  );
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 24), new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.8 }));
  const head = new THREE.Group();
  head.add(core, grille);
  head.position.y = 1.15;
  // ободок под головкой — лаймовый акцент бренда
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.075, 20, 64), lime);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.62;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.42, 0.34, 48), chrome);
  neck.position.y = 0.42;
  // ручка: сужается книзу
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.24, 2.3, 48), darkChrome);
  handle.position.y = -0.9;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.32, 0.18, 48), pink);
  band.position.y = -0.35;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.16, 48), chrome);
  cap.position.y = -2.1;
  mic.add(head, ring, neck, handle, band, cap);
  mic.rotation.z = -0.32;
  const stage = new THREE.Group();
  stage.add(mic);
  stage.position.y = 0.1;
  scene.add(stage);

  // цветные огни для бликов
  const lights = [
    new THREE.PointLight(0xfe76b4, 18, 12, 1.5),
    new THREE.PointLight(0x6cd0f0, 16, 12, 1.5),
    new THREE.PointLight(0xffffff, 22, 12, 1.5),
  ];
  lights[0].position.set(3, 2, 3);
  lights[1].position.set(-3, -1, 3);
  lights[2].position.set(0, 3, 4);
  lights.forEach((l) => scene.add(l));

  /* ---------- конфетти ---------- */
  const N = opts.mobile ? 140 : 320;
  const confMat = new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide });
  const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.15), confMat, N);
  conf.frustumCulled = false;
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) conf.setColorAt(i, col.set(PALETTE[i % PALETTE.length]));
  const P = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }));
  const dummy = new THREE.Object3D();
  const hide = () => {
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = 0; i < N; i++) conf.setMatrixAt(i, dummy.matrix);
    conf.instanceMatrix.needsUpdate = true;
  };
  hide();
  scene.add(conf);
  let confActive = false;

  /* ---------- состояние ---------- */
  let targetY = 0;
  let rotY = 0;
  let t = 0;
  let raf = 0;
  let running = false;
  let last = performance.now();
  let spinBoost = 0;

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
    rotY += (targetY - rotY) * Math.min(1, dt * 4);
    spinBoost *= 0.96;
    mic.rotation.y = rotY + t * 0.15 + spinBoost;
    stage.position.y = 0.1 + Math.sin(t * 1.3) * 0.06;
    stage.rotation.x = Math.sin(t * 0.7) * 0.05;

    if (confActive) {
      let alive = 0;
      for (let i = 0; i < N; i++) {
        const q = P[i];
        if (q.life <= 0) {
          dummy.scale.setScalar(0);
        } else {
          q.life -= dt;
          q.v.y -= 6.5 * dt; // гравитация
          q.v.multiplyScalar(1 - 0.9 * dt); // сопротивление воздуха
          q.p.addScaledVector(q.v, dt);
          q.r.x += q.w.x * dt;
          q.r.y += q.w.y * dt;
          q.r.z += q.w.z * dt;
          dummy.position.copy(q.p);
          dummy.rotation.copy(q.r);
          dummy.scale.setScalar(Math.min(1, q.life * 1.5));
          alive++;
        }
        dummy.updateMatrix();
        conf.setMatrixAt(i, dummy.matrix);
      }
      conf.instanceMatrix.needsUpdate = true;
      if (!alive) confActive = false;
    }
    renderer.render(scene, camera);
  }

  function loop(now: number) {
    frame(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  resize();
  frame(performance.now());

  return {
    setStep(i, total) {
      // полный оборот за всю форму + лёгкий «кивок»
      targetY = (i / Math.max(1, total - 1)) * Math.PI * 2;
      spinBoost += 0.6;
      if (opts.reduced) {
        rotY = targetY;
        frame(performance.now());
      }
    },
    celebrate() {
      if (opts.reduced) return;
      spinBoost += 6;
      const origin = new THREE.Vector3(0, 1.4, 0).applyMatrix4(head.matrixWorld);
      P.forEach((q) => {
        q.p.copy(origin);
        const a = Math.random() * Math.PI * 2;
        const up = 4 + Math.random() * 5;
        const side = 1.5 + Math.random() * 3.5;
        q.v.set(Math.cos(a) * side, up, Math.sin(a) * side * 0.6);
        q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        q.w.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18);
        q.life = 2.2 + Math.random() * 1.6;
      });
      confActive = true;
    },
    resize,
    start() {
      if (running || opts.reduced) return;
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
