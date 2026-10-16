// «Жидкое» искажение + неоновое свечение фото в карточках залов при наведении.
// Один WebGL-canvas на страницу: переезжает в карточку под курсором и рисует её активное фото
// через шейдер (волна от курсора, шумовая рябь, хроматическая аберрация, неон по краю цвета группы).
// Только для мыши; на таче и при reduced-motion не включается.
import { reduced } from "../motion";

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main(){ uv = p * .5 + .5; uv.y = 1. - uv.y; gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
uniform vec2 scale;     // object-fit: cover
uniform vec2 mouse;     // 0..1
uniform float t;
uniform float k;        // сила эффекта 0..1
uniform vec3 neon;
uniform vec2 res;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1., 0.)), c = hash(i + vec2(0., 1.)), d = hash(i + vec2(1., 1.));
  vec2 u = f * f * (3. - 2. * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1. - u.x) + (d - b) * u.x * u.y;
}
vec2 cover(vec2 q){ return (q - .5) * scale + .5; }

void main(){
  vec2 q = uv;
  // волна от курсора
  vec2 asp = vec2(res.x / res.y, 1.);
  vec2 dm = (q - mouse) * asp;
  float d = length(dm);
  float ripple = sin(d * 34. - t * 6.) * exp(-d * 4.2);
  q += normalize(dm + 1e-4) / asp * ripple * .016 * k;
  // медленная «жидкая» рябь по всему фото
  float n = noise(q * 4. + t * .35) - .5;
  float n2 = noise(q * 7. - t * .25) - .5;
  q += vec2(n, n2) * .022 * k;
  // хроматическая аберрация
  vec2 ca = (q - mouse) * .012 * k;
  vec3 col;
  col.r = texture2D(tex, cover(q + ca)).r;
  col.g = texture2D(tex, cover(q)).g;
  col.b = texture2D(tex, cover(q - ca)).b;
  // неон: свечение по краям кадра и вокруг курсора
  float e = min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y));
  float edge = 1. - smoothstep(0., .07, e);
  float halo = exp(-d * 5.5) * .35;
  col += neon * (edge * .85 + halo) * k;
  col = mix(col, col * vec3(1.05, .98, 1.08), k * .4);
  gl_FragColor = vec4(col, 1.);
}`;

export function initLiquid(root: ParentNode = document) {
  if (reduced() || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "liquid";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: "1", pointerEvents: "none", opacity: "0", transition: "opacity .25s" } as CSSStyleDeclaration);
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
  if (!gl) return;

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uScale = U("scale"), uMouse = U("mouse"), uT = U("t"), uK = U("k"), uNeon = U("neon"), uRes = U("res");
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let media: HTMLElement | null = null;
  let img: HTMLImageElement | null = null;
  let k = 0, kT = 0;
  const m = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let raf = 0;
  const t0 = performance.now();
  const neon = [1, 1, 1];

  function cssColor(el: HTMLElement) {
    // цвет группы вместимости из --g → rgb
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(el).getPropertyValue("--g") || "#C9E543";
    el.appendChild(probe);
    const c = getComputedStyle(probe).color.match(/\d+/g)!.map(Number);
    probe.remove();
    return c.slice(0, 3).map((v) => v / 255);
  }

  function upload(i: HTMLImageElement) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, i);
      img = i;
    } catch {
      img = null;
    }
  }

  function frame() {
    if (!media) return;
    const active = media.querySelector<HTMLImageElement>("img.is-active");
    if (active && active !== img && active.complete && active.naturalWidth) upload(active);
    k += (kT - k) * 0.12;
    m.x += (m.tx - m.x) * 0.15;
    m.y += (m.ty - m.y) * 0.15;
    const w = media.clientWidth, h = media.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    if (img) {
      const ia = img.naturalWidth / img.naturalHeight, ca = w / h;
      gl.uniform2f(uScale, ia > ca ? ca / ia : 1, ia > ca ? 1 : ia / ca);
    }
    gl.uniform2f(uMouse, m.x, m.y);
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uT, (performance.now() - t0) / 1000);
    gl.uniform1f(uK, k);
    gl.uniform3f(uNeon, neon[0], neon[1], neon[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (kT === 0 && k < 0.01) {
      canvas.style.opacity = "0";
      canvas.remove();
      media = null;
      img = null;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  root.querySelectorAll<HTMLElement>(".card__media").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      cancelAnimationFrame(raf);
      media = el;
      img = null;
      const c = cssColor(el);
      neon[0] = c[0]; neon[1] = c[1]; neon[2] = c[2];
      el.appendChild(canvas);
      canvas.style.opacity = "1";
      kT = 1;
      raf = requestAnimationFrame(frame);
    });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      m.tx = (e.clientX - r.left) / r.width;
      m.ty = (e.clientY - r.top) / r.height;
    });
    el.addEventListener("pointerleave", () => {
      kT = 0;
    });
  });
}
