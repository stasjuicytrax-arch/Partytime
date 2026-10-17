import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { reduced, lenis } from "./motion";
import { reachGoal, hit } from "../lib/analytics";
import { botUrl, roomTag } from "../lib/bot";

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

/** Первое фото карточки — только когда карточка видна */
function showFirst(card: HTMLElement) {
  const img = card.querySelector<HTMLImageElement>(".card__media img.is-active[data-src]");
  if (!img) return;
  img.srcset = img.dataset.srcset!;
  img.src = img.dataset.src!;
  img.removeAttribute("data-src");
  img.removeAttribute("data-srcset");
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
  // локации без залов в каталоге: вместо сетки — карточка с адресом и контактом
  const newLocs = [...root.querySelectorAll<HTMLElement>("[data-newloc]")];
  const filtersWrap = root.querySelector<HTMLElement>("[data-filters-wrap]");

  const params = new URLSearchParams(location.search);
  const state = {
    loc: locBtns.some((b) => b.dataset.loc === params.get("loc")) ? params.get("loc")! : "dumskaya",
    group: "all",
    expanded: false,
  };
  const more = root.querySelector<HTMLElement>("[data-more]")!;
  const moreLabel = root.querySelector<HTMLElement>("[data-more-label]")!;
  const grid0 = root.querySelector<HTMLElement>("[data-grid]")!;
  // сколько залов видно до «Показать ещё»: 2 ряда на десктопе, 4 карточки на телефоне
  const limit = () => (matchMedia("(max-width: 767px)").matches ? 4 : matchMedia("(max-width: 1023px)").matches ? 4 : 6);
  const matches = (el: HTMLElement) => el.dataset.loc === state.loc && (state.group === "all" || el.dataset.group === state.group);

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
    let visible = 0;
    const lim = limit();
    cards.forEach((el) => {
      const on = matches(el);
      if (on) shown++;
      const show = on && (state.expanded || shown <= lim);
      el.hidden = !show;
      if (show) {
        visible++;
        showFirst(el);
      }
    });
    const isNew = newLocs.some((n) => n.dataset.newloc === state.loc);
    newLocs.forEach((n) => (n.hidden = n.dataset.newloc !== state.loc));
    if (filtersWrap) filtersWrap.hidden = isNew;
    grid0.hidden = isNew;
    empty.hidden = shown > 0 || isNew;
    const rest = shown - visible;
    more.hidden = rest <= 0;
    grid0.classList.toggle("is-clipped", rest > 0);
    moreLabel.textContent = `Показать ещё ${rest} ${plural(rest, ["зал", "зала", "залов"])}`;
    const locName = locBtns.find((b) => b.dataset.loc === state.loc)?.querySelector(".loc__name")?.textContent;
    status.textContent = isNew ? `${locName}: подберём зал по телефону или в Telegram` : `${locName}: ${shown} ${plural(shown, ["зал", "зала", "залов"])}`;

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
      state.expanded = false;
      apply();
    })
  );
  // «Оставить заявку на этой локации» → форма с выбранной локацией
  root.querySelectorAll<HTMLAnchorElement>("[data-newloc-book]").forEach((a) =>
    a.addEventListener("click", () => window.dispatchEvent(new CustomEvent("pt:booking", { detail: { loc: a.dataset.newlocBook } })))
  );
  chips.forEach((c) =>
    c.addEventListener("click", () => {
      if (state.group === c.dataset.group) return;
      state.group = c.dataset.group!;
      state.expanded = false;
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

  root.querySelector("[data-more-btn]")!.addEventListener("click", () => {
    const before = new Set(cards.filter((c) => !c.hidden));
    state.expanded = true;
    apply(false);
    const fresh = cards.filter((c) => !c.hidden && !before.has(c));
    fresh[0]?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    if (!reduced()) gsap.fromTo(fresh, { opacity: 0, y: 60, rotate: () => gsap.utils.random(-3, 3) }, { opacity: 1, y: 0, rotate: 0, duration: 0.7, ease: "expo.out", stagger: 0.05, clearProps: "transform,opacity" });
  });

  /* ---------- подсказка горизонтального скролла (mobile) ---------- */
  root.querySelectorAll<HTMLElement>("[data-scroll-hint]").forEach((wrap) => {
    const row = wrap.querySelector<HTMLElement>(".rc__locs, .rc__filters")!;
    const upd = () => wrap.classList.toggle("is-end", row.scrollLeft + row.clientWidth >= row.scrollWidth - 8);
    row.addEventListener("scroll", upd, { passive: true });
    addEventListener("resize", upd);
    upd();
    // один раз «подталкиваем» ленту, когда она впервые попадает в экран
    if (!reduced() && row.scrollWidth > row.clientWidth) {
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        gsap.to(row, { scrollLeft: 64, duration: 0.5, ease: "power2.out", delay: 0.3, yoyo: true, repeat: 1, repeatDelay: 0.25 });
      }, { threshold: 0.9 });
      io.observe(row);
    }
  });

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
  const thumbs = dialog.querySelector<HTMLElement>("[data-thumbs]")!;
  thumbs.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-thumb]");
    if (b) go(Number(b.dataset.thumb));
  });
  const prev = dialog.querySelector<HTMLButtonElement>("[data-prev]")!;
  const next = dialog.querySelector<HTMLButtonElement>("[data-next]")!;
  const f = (k: string) => dialog.querySelector<HTMLElement>(`[data-f="${k}"]`)!;
  const simList = dialog.querySelector<HTMLElement>("[data-sim-list]")!;
  const simBox = dialog.querySelector<HTMLElement>("[data-similar]")!;
  const roomTg = dialog.querySelector<HTMLAnchorElement>("[data-room-tg]")!;
  const panel = dialog.querySelector<HTMLElement>(".rm__panel")!;
  let current: ClientRoom | null = null;
  let pushed = false;
  let slide = 0;

  /** 3–4 зала той же группы: сначала та же локация, затем другая; без текущего */
  function similarTo(r: ClientRoom) {
    const same = data.filter((x) => x.group === r.group && x.slug !== r.slug);
    return [...same.filter((x) => x.loc === r.loc), ...same.filter((x) => x.loc !== r.loc)].slice(0, 4);
  }
  // «Залы поменьше»: ближайшая меньшая группа вместимости, потом ещё меньше; своя локация — первой
  const groupOrder = ["2-4", "6-8", "8-10", "15-20"];
  function smallerThan(r: ClientRoom) {
    const gi = groupOrder.indexOf(r.group);
    return data
      .filter((x) => groupOrder.indexOf(x.group) < gi)
      .sort((a, b) => groupOrder.indexOf(b.group) - groupOrder.indexOf(a.group) || Number(b.loc === r.loc) - Number(a.loc === r.loc))
      .slice(0, 4);
  }
  let simTab: "same" | "smaller" = "same";
  const simTabs = [...dialog.querySelectorAll<HTMLButtonElement>("[data-simtab]")];
  // значки для карточек «Похожие залы»: гости и площадь
  const icoGuests = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M18 14a6 6 0 0 1 4 7"/></svg>';
  const icoArea = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M3 3h18v18H3zM3 9h4M3 15h2M9 3v4M15 3v2"/></svg>';
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  function renderSimilar(r: ClientRoom) {
    const lists = { same: similarTo(r), smaller: smallerThan(r) };
    // пустую вкладку не показываем; если выбранная опустела — переключаемся на другую
    simTabs.forEach((t) => (t.hidden = lists[t.dataset.simtab as "same" | "smaller"].length === 0));
    if (!lists[simTab].length) simTab = lists.same.length ? "same" : "smaller";
    simTabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.simtab === simTab)));
    simList.setAttribute("aria-labelledby", `rm-tab-${simTab}`);
    const list = lists[simTab];
    simBox.hidden = !lists.same.length && !lists.smaller.length;
    simList.innerHTML = list
      .map(
        (x) => `<li><button type="button" class="rm__sim-card" data-sim="${x.slug}" style="--g: var(--c-cap-${x.group})">
          <img src="${x.images[0].src.replace("-960.", "-480.")}" alt="" width="480" height="320" loading="lazy" decoding="async">
          <span class="rm__sim-title">${esc(x.title)}</span>
          <span class="rm__sim-facts"><span>${icoGuests}${esc(x.capacity)}</span>${x.area ? `<span>${icoArea}${x.area}&nbsp;м²</span>` : ""}</span>
          <span class="rm__sim-meta">${esc(x.locName)} · от ${esc(x.price)}</span>
        </button></li>`
      )
      .join("");
  }
  simList.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-sim]");
    if (!b || !current) return;
    const to = b.dataset.sim!;
    reachGoal("similar_room_click", { from: current.slug, to, list: simTab });
    swapTo(to);
  });

  simTabs.forEach((t) =>
    t.addEventListener("click", () => {
      if (!current || simTab === t.dataset.simtab) return;
      simTab = t.dataset.simtab as "same" | "smaller";
      renderSimilar(current);
      if (!reduced()) gsap.fromTo(simList.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out", clearProps: "all" });
    })
  );
  // стрелки влево/вправо переключают вкладки
  dialog.querySelector(".rm__simtabs")?.addEventListener("keydown", (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== "ArrowLeft" && k !== "ArrowRight") return;
    e.stopPropagation();
    const vis = simTabs.filter((t) => !t.hidden);
    const i = vis.findIndex((t) => t.dataset.simtab === simTab);
    const nx = vis[(i + (k === "ArrowRight" ? 1 : -1) + vis.length) % vis.length];
    nx.focus();
    nx.click();
  });

  const focusTitle = () => {
    const t = dialog.querySelector<HTMLElement>("#rm-title")!;
    t.tabIndex = -1;
    t.focus({ preventScroll: true });
  };
  /** переход к другому залу внутри открытой модалки — без закрытия */
  function swapTo(slug: string) {
    if (reduced()) {
      open(slug);
      dialog.scrollTo({ top: 0 });
      panel.querySelector<HTMLElement>(".rm__body")?.scrollTo({ top: 0 });
      focusTitle();
      return;
    }
    const parts = panel.querySelectorAll(".rm__gallery, .rm__thumbs, .rm__body, .rm__sim");
    gsap.to(parts, {
      opacity: 0,
      x: -24,
      duration: 0.22,
      ease: "power2.in",
      stagger: 0.015,
      onComplete: () => {
        open(slug);
        dialog.scrollTo({ top: 0 });
        panel.querySelector<HTMLElement>(".rm__body")?.scrollTo({ top: 0 });
        focusTitle();
        gsap.fromTo(parts, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.45, ease: "expo.out", stagger: 0.02, clearProps: "opacity,transform" });
      },
    });
  }
  let lastFocus: HTMLElement | null = null;

  function go(i: number, instant = false) {
    if (!current) return;
    const n = current.images.length;
    slide = (i + n) % n;
    track.style.transition = instant || reduced() ? "none" : "";
    track.style.transform = `translate3d(${-slide * 100}%,0,0)`;
    counter.textContent = n > 1 ? `${slide + 1} / ${n}` : "";
    // подсветка текущего превью; лента сама докручивается до него
    thumbs.querySelectorAll<HTMLButtonElement>("[data-thumb]").forEach((b, k) => {
      const on = k === slide;
      b.setAttribute("aria-current", String(on));
      if (on) {
        const l = b.offsetLeft - (thumbs.clientWidth - b.offsetWidth) / 2;
        thumbs.scrollTo({ left: l, behavior: instant || reduced() ? "auto" : "smooth" });
      }
    });
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
    thumbs.innerHTML = r.images
      .map(
        (im, i) =>
          `<button type="button" class="rm__thumb" data-thumb="${i}" aria-label="Фото ${i + 1} из ${r.images.length}"><img src="${im.src.replace(/-(960|1600)./, "-480.")}" alt="" width="480" height="320" loading="lazy" decoding="async" draggable="false"></button>`
      )
      .join("");
    const multi = r.images.length > 1;
    thumbs.hidden = !multi;
    prev.hidden = next.hidden = !multi;
    go(0, true);
    renderSimilar(r);
    roomTg.href = botUrl(roomTag(r.slug));
    // аналитика: открытие зала = виртуальный просмотр страницы (цель «6+ страниц»)
    reachGoal("room_open", { slug: r.slug });
    hit(`${location.origin}${location.pathname}#room-${r.slug}`, `Зал «${r.title}»`);
    try {
      const n = Number(sessionStorage.getItem("pt:rooms-viewed") || 0) + 1;
      sessionStorage.setItem("pt:rooms-viewed", String(n));
      window.dispatchEvent(new CustomEvent("pt:room-view", { detail: { count: n } }));
    } catch {}
    if (!dialog.open) {
      dialog.showModal();
      lenis()?.stop();
      document.documentElement.classList.add("modal-open");
      if (!reduced()) {
        gsap.fromTo(dialog.querySelector(".rm__panel"), { y: 60, opacity: 0, rotate: 1.5 }, { y: 0, opacity: 1, rotate: 0, duration: 0.55, ease: "expo.out", clearProps: "transform,opacity" });
        gsap.fromTo(dialog, { "--veil": 0 }, { "--veil": 1, duration: 0.4 });
      }
    }
    if (push) {
      const url = `${location.pathname}${location.search}#room-${slug}`;
      // первое открытие — новая запись истории (системная «Назад» закроет модалку), смена зала — замена записи
      if (!pushed) {
        history.pushState({ ptRoom: true }, "", url);
        pushed = true;
      } else history.replaceState({ ptRoom: true }, "", url);
    }
  }

  function close() {
    if (!dialog.open) return;
    const done = () => {
      dialog.close();
      lenis()?.start();
      document.documentElement.classList.remove("modal-open");
      if (pushed) {
        pushed = false;
        history.back(); // убираем свою запись: «Назад» после закрытия не откроет модалку снова
      } else if (location.hash.startsWith("#room-")) history.replaceState(null, "", location.pathname + location.search);
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
    pushed = false;
    // после перехода к форме поп-ап «прогрева» уже не показываем
    try { sessionStorage.setItem("pt:pop-warm-shown", "1"); } catch {}
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
      if (r.loc !== state.loc || cards.find((c) => c.dataset.slug === r.slug)?.hidden) {
        state.loc = r.loc;
        state.group = "all";
        state.expanded = true;
        apply(false);
      }
      open(m[1], false);
    } else if (dialog.open) {
      pushed = false; // запись уже снята системной «Назад»
      close();
    }
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
}
