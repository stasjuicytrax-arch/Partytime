import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { reduced, lenis } from "./motion";

gsap.registerPlugin(Flip);

interface ClientRoom {
  slug: string;
  loc: string;
  locName: string;
  title: string;
  group: string;
  capacity: string;
  area: number | null;
  price: string;
  tagline: string;
  text: string;
  images: { src: string; srcset: string; alt: string }[];
}

const plural = (n: number, [one, few, many]: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

/** Подгружает отложенные фото карточки (data-src → src) */
function hydrate(media: HTMLElement) {
  if (media.dataset.hydrated) return;
  media.dataset.hydrated = "1";
  media.querySelectorAll<HTMLImageElement>("img[data-src]").forEach((img) => {
    img.srcset = img.dataset.srcset!;
    img.src = img.dataset.src!;
    img.removeAttribute("data-src");
    img.removeAttribute("data-srcset");
  });
}

function showPhoto(media: HTMLElement, idx: number) {
  const imgs = media.querySelectorAll("img");
  const dots = media.querySelectorAll(".card__dots span");
  imgs.forEach((im, i) => im.classList.toggle("is-active", i === idx));
  dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));
  media.dataset.idx = String(idx);
}

export function initCatalog(root: HTMLElement) {
  const data: ClientRoom[] = JSON.parse(root.querySelector("#rooms-data")!.textContent || "[]");
  const bySlug = new Map(data.map((r) => [r.slug, r]));
  const grid = root.querySelector<HTMLElement>("[data-grid]")!;
  const cards = [...grid.querySelectorAll<HTMLElement>(".card")];
  const locBtns = [...root.querySelectorAll<HTMLButtonElement>(".loc[data-loc]")];
  const chips = [...root.querySelectorAll<HTMLButtonElement>(".chip[data-group]")];
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const empty = root.querySelector<HTMLElement>("[data-empty]")!;

  const params = new URLSearchParams(location.search);
  const state = {
    loc: locBtns.some((b) => b.dataset.loc === params.get("loc")) ? params.get("loc")! : "dumskaya",
    group: "all",
  };

  /* ---------- фильтры ---------- */
  function apply(animate = true) {
    locBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.loc === state.loc)));
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.group === state.group)));
    root.dataset.loc = state.loc;

    // счётчики в чипах — для текущей локации
    chips.forEach((c) => {
      const g = c.dataset.group!;
      const n = cards.filter((el) => el.dataset.loc === state.loc && (g === "all" || el.dataset.group === g)).length;
      const out = c.querySelector<HTMLElement>("[data-count]");
      if (out) out.textContent = String(n);
      c.toggleAttribute("data-zero", n === 0);
    });

    const flipState = animate && !reduced() ? Flip.getState(cards, { props: "opacity" }) : null;
    let shown = 0;
    cards.forEach((el) => {
      const on = el.dataset.loc === state.loc && (state.group === "all" || el.dataset.group === state.group);
      el.hidden = !on;
      if (on) shown++;
    });
    empty.hidden = shown > 0;
    const locName = locBtns.find((b) => b.dataset.loc === state.loc)?.querySelector(".loc__name")?.textContent;
    status.textContent = `${locName}: ${shown} ${plural(shown, ["зал", "зала", "залов"])}`;

    if (flipState) {
      Flip.from(flipState, {
        duration: 0.6,
        ease: "power3.inOut",
        stagger: 0.015,
        absolute: true,
        nested: true,
        onEnter: (els) =>
          gsap.fromTo(els, { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.5)", stagger: 0.03, clearProps: "transform,opacity" }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in" }),
        onComplete: () => window.dispatchEvent(new Event("resize")),
      });
    }
  }

  locBtns.forEach((b) =>
    b.addEventListener("click", () => {
      if (state.loc === b.dataset.loc) return;
      state.loc = b.dataset.loc!;
      state.group = "all";
      apply();
    })
  );
  chips.forEach((c) =>
    c.addEventListener("click", () => {
      if (state.group === c.dataset.group) return;
      state.group = c.dataset.group!;
      apply();
    })
  );
  root.querySelector("[data-reset]")?.addEventListener("click", () => {
    state.group = "all";
    apply();
  });
  // неактивные локации: не кликаются, tooltip по hover/focus (CSS)
  root.querySelectorAll<HTMLElement>(".loc--soon").forEach((b) =>
    b.addEventListener("click", (e) => e.preventDefault())
  );

  apply(false);

  /* ---------- листание фото курсором / свайпом ---------- */
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  cards.forEach((card) => {
    const media = card.querySelector<HTMLElement>(".card__media")!;
    const n = Number(media.dataset.count);
    if (n < 2) return;
    if (fine) {
      media.addEventListener("pointerenter", () => hydrate(media));
      media.addEventListener("pointermove", (e) => {
        const r = media.getBoundingClientRect();
        const idx = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)));
        if (String(idx) !== media.dataset.idx) showPhoto(media, idx);
      });
      media.addEventListener("pointerleave", () => showPhoto(media, 0));
    } else {
      let x0 = 0, y0 = 0, swiping = false;
      media.addEventListener("touchstart", (e) => {
        hydrate(media);
        x0 = e.touches[0].clientX;
        y0 = e.touches[0].clientY;
        swiping = false;
      }, { passive: true });
      media.addEventListener("touchmove", (e) => {
        const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
        if (!swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) swiping = true;
      }, { passive: true });
      media.addEventListener("touchend", (e) => {
        if (!swiping) return;
        const dx = e.changedTouches[0].clientX - x0;
        const cur = Number(media.dataset.idx || 0);
        showPhoto(media, (cur + (dx < 0 ? 1 : -1) + n) % n);
        card.dataset.swiped = "1";
      });
      // свайп не должен открывать модалку
      card.querySelector("a")!.addEventListener("click", (e) => {
        if (card.dataset.swiped) {
          e.preventDefault();
          delete card.dataset.swiped;
        }
      }, true);
    }
  });

  /* ---------- модалка зала ---------- */
  const dialog = root.querySelector<HTMLDialogElement>("[data-modal]")!;
  const track = dialog.querySelector<HTMLElement>("[data-track]")!;
  const counter = dialog.querySelector<HTMLElement>("[data-counter]")!;
  const prev = dialog.querySelector<HTMLButtonElement>("[data-prev]")!;
  const next = dialog.querySelector<HTMLButtonElement>("[data-next]")!;
  const f = (k: string) => dialog.querySelector<HTMLElement>(`[data-f="${k}"]`)!;
  let current: ClientRoom | null = null;
  let slide = 0;
  let lastFocus: HTMLElement | null = null;

  function go(i: number, instant = false) {
    if (!current) return;
    const n = current.images.length;
    slide = (i + n) % n;
    track.style.transition = instant || reduced() ? "none" : "";
    track.style.transform = `translate3d(${-slide * 100}%,0,0)`;
    counter.textContent = n > 1 ? `${slide + 1} / ${n}` : "";
    track.querySelectorAll("img").forEach((im, k) => {
      if (Math.abs(k - slide) <= 1) im.loading = "eager";
    });
  }

  function open(slug: string, push = true) {
    const r = bySlug.get(slug);
    if (!r) return;
    current = r;
    if (!dialog.open) lastFocus = document.activeElement as HTMLElement;
    dialog.dataset.group = r.group;
    dialog.style.setProperty("--g", `var(--c-cap-${r.group})`);
    f("loc").textContent = `${r.locName}`;
    f("title").textContent = r.title;
    f("tagline").textContent = r.tagline;
    f("text").textContent = r.text;
    f("price").textContent = r.price;
    f("badges").innerHTML =
      `<span class="badge badge--cap">${r.capacity}</span>` +
      (r.area ? `<span class="badge num">${r.area} м²</span>` : "");
    track.innerHTML = r.images
      .map(
        (im, i) =>
          `<figure class="rm__slide"><img src="${im.src}" srcset="${im.srcset}" sizes="(max-width: 899px) 100vw, 62vw" alt="${im.alt.replace(/"/g, "&quot;")}" width="1600" height="1067" loading="${i < 2 ? "eager" : "lazy"}" decoding="async" draggable="false"></figure>`
      )
      .join("");
    const multi = r.images.length > 1;
    prev.hidden = next.hidden = !multi;
    go(0, true);
    if (!dialog.open) {
      dialog.showModal();
      lenis()?.stop();
      document.documentElement.classList.add("modal-open");
      if (!reduced()) {
        gsap.fromTo(dialog.querySelector(".rm__panel"), { y: 60, opacity: 0, rotate: 1.5 }, { y: 0, opacity: 1, rotate: 0, duration: 0.55, ease: "expo.out", clearProps: "transform,opacity" });
        gsap.fromTo(dialog, { "--veil": 0 }, { "--veil": 1, duration: 0.4 });
      }
    }
    if (push) history.replaceState(null, "", `${location.pathname}${location.search}#room-${slug}`);
  }

  function close() {
    if (!dialog.open) return;
    const done = () => {
      dialog.close();
      lenis()?.start();
      document.documentElement.classList.remove("modal-open");
      if (location.hash.startsWith("#room-")) history.replaceState(null, "", location.pathname + location.search);
      lastFocus?.focus({ preventScroll: true });
      current = null;
    };
    if (reduced()) return done();
    gsap.to(dialog.querySelector(".rm__panel"), { y: 40, opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => {
      done();
      gsap.set(dialog.querySelector(".rm__panel"), { clearProps: "all" });
    } });
  }

  grid.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>(".card__link");
    if (!a || e.defaultPrevented) return;
    e.preventDefault();
    open(a.closest<HTMLElement>(".card")!.dataset.slug!);
  });
  dialog.querySelector("[data-close]")!.addEventListener("click", close);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
  prev.addEventListener("click", () => go(slide - 1));
  next.addEventListener("click", () => go(slide + 1));
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(slide - 1);
    if (e.key === "ArrowRight") go(slide + 1);
  });

  // свайп галереи
  const gallery = dialog.querySelector<HTMLElement>("[data-gallery]")!;
  let sx = 0, sy = 0, dragging = false, w = 1;
  gallery.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest("button") || !current || current.images.length < 2) return;
    sx = e.clientX; sy = e.clientY; dragging = true; w = gallery.clientWidth;
    track.style.transition = "none";
  });
  gallery.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    if (Math.abs(e.clientY - sy) > Math.abs(dx) && Math.abs(dx) < 10) return;
    track.style.transform = `translate3d(calc(${-slide * 100}% + ${dx}px),0,0)`;
  });
  const end = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - sx;
    track.style.transition = "";
    if (Math.abs(dx) > w * 0.15) go(slide + (dx < 0 ? 1 : -1));
    else go(slide);
  };
  gallery.addEventListener("pointerup", end);
  gallery.addEventListener("pointercancel", end);
  gallery.addEventListener("pointerleave", end);

  // «Забронировать этот зал» → #booking с параметрами + предзаполнение формы
  dialog.querySelector<HTMLAnchorElement>("[data-book]")!.addEventListener("click", (e) => {
    if (!current) return;
    e.preventDefault();
    const { slug, loc, title, locName } = current;
    try {
      const saved = JSON.parse(localStorage.getItem("pt:booking") || "{}");
      localStorage.setItem("pt:booking", JSON.stringify({ ...saved, loc, room: slug }));
    } catch {}
    close();
    const qs = new URLSearchParams({ loc, room: slug });
    setTimeout(() => {
      history.replaceState(null, "", `${location.pathname}?${qs}#booking`);
      window.dispatchEvent(new CustomEvent("pt:booking", { detail: { loc, room: slug, title, locName } }));
      const target = document.getElementById("booking");
      if (target) (lenis() ? lenis()!.scrollTo(target, { offset: -40 }) : target.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }));
    }, reduced() ? 0 : 280);
  });

  // ссылка #room-<slug> открывает модалку
  const fromHash = () => {
    const m = location.hash.match(/^#room-(.+)$/);
    if (m && bySlug.has(m[1])) {
      const r = bySlug.get(m[1])!;
      if (r.loc !== state.loc) {
        state.loc = r.loc;
        state.group = "all";
        apply(false);
      }
      open(m[1], false);
    } else if (dialog.open) close();
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
}
