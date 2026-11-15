import { LngLatBounds, Map, Marker, NavigationControl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Pin {
  lat: number;
  lon: number;
  id: string;
  name: string;
  number: number;
}

const MAP_COLORS: Record<string, Record<string, string>> = {
  background: { "background-color": "#252832" },
  water: { "fill-color": "#255264" },
  waterway: { "line-color": "#498a9e" },
  building: { "fill-color": "#353a44", "fill-outline-color": "#424957" },
  landuse_park: { "fill-color": "#2d3a35" },
  highway_path: { "line-color": "#5a6171" },
  highway_minor: { "line-color": "#717787" },
  highway_major_casing: { "line-color": "#3e4351" },
  highway_major_inner: { "line-color": "#989eab" },
  highway_major_subtle: { "line-color": "#7c8291" },
  highway_motorway_casing: { "line-color": "#3e4351" },
  highway_motorway_inner: { "line-color": "#aeb3be" },
  highway_motorway_subtle: { "line-color": "#7c8291" },
};

async function getMapStyle(): Promise<StyleSpecification> {
  const response = await fetch("https://tiles.openfreemap.org/styles/dark");
  if (!response.ok) throw new Error("Map style unavailable");

  const style: StyleSpecification = await response.json();
  for (const layer of style.layers) {
    const colors = MAP_COLORS[layer.id];
    if (colors) Object.assign(layer.paint ??= {}, colors);
    if (layer.type !== "symbol" || !layer.layout) continue;
    const label = layer.layout["text-field"];
    if ((typeof label !== "string" && !Array.isArray(label)) || !/name/.test(JSON.stringify(label))) continue;

    layer.layout["text-field"] = ["coalesce", ["get", "name:ru"], ["get", "name"], label];
    Object.assign(layer.paint ??= {}, {
      "text-color": layer.id.startsWith("water") ? "#c8edf5" : "#f4f2f7",
      "text-halo-color": "#22262e",
      "text-halo-width": 1.35,
    });
  }
  return style;
}

function showCredits(credits: HTMLDetailsElement) {
  credits.hidden = false;
  if (!("IntersectionObserver" in window)) return;

  let timer: number;
  const stop = () => {
    window.clearTimeout(timer);
    observer.disconnect();
  };
  const observer = new IntersectionObserver(([entry]) => {
    window.clearTimeout(timer);
    if (entry.intersectionRatio < 0.75) return;
    timer = window.setTimeout(() => {
      if (!credits.contains(document.activeElement)) credits.open = false;
      stop();
    }, 5000);
  }, { threshold: 0.75 });
  credits.querySelector("summary")?.addEventListener("click", stop, { once: true });
  observer.observe(credits);
}

export async function initContactMap(root: HTMLElement) {
  const container = root.querySelector<HTMLElement>("[data-map-canvas]");
  const status = root.querySelector<HTMLElement>("[data-map-status]");
  const credits = root.querySelector<HTMLDetailsElement>("[data-map-credits]");
  const pins: Pin[] = JSON.parse(root.dataset.contactMap ?? "[]");
  if (!container || !status || !credits || !pins.length) throw new Error("Map is incomplete");

  const style = await getMapStyle();
  const bounds = new LngLatBounds();
  pins.forEach(({ lon, lat }) => bounds.extend([lon, lat]));
  const fit = { padding: { top: 60, right: 25, bottom: 60, left: 25 }, maxZoom: 13 };
  const duration = () => matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
  const map = new Map({
    container, style, bounds, fitBoundsOptions: fit,
    attributionControl: false, scrollZoom: true,
    minZoom: 9, maxZoom: 18, maxPitch: 0, dragRotate: false, touchPitch: false,
    locale: {
      "Map.Title": "Карта Петербурга",
      "NavigationControl.ZoomIn": "Приблизить",
      "NavigationControl.ZoomOut": "Отдалить",
    },
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new NavigationControl({ showCompass: false }), "top-right");

  const markers = pins.map((pin) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "contact-map__pin";
    button.textContent = String(pin.number);
    button.title = pin.name;
    button.setAttribute("aria-label", `Приблизить локацию «${pin.name}»`);
    button.setAttribute("aria-pressed", "false");
    button.style.setProperty("--pin-color", pin.id === "mayakovskaya" ? "var(--pt-violet-l)" : `var(--c-loc-${pin.id}, var(--pt-lime))`);
    button.addEventListener("click", () => {
      markers.forEach(({ button: marker }) => marker.setAttribute("aria-pressed", String(marker === button)));
      map.easeTo({ center: [pin.lon, pin.lat], zoom: 15.2, duration: duration() });
    });
    const marker = new Marker({ element: button }).setLngLat([pin.lon, pin.lat]).addTo(map);
    return { button, marker, id: pin.id };
  });

  // У двух точек в центре должны оставаться отдельные зоны нажатия даже в общем виде.
  const centerWest = markers.find(({ id }) => id === "dumskaya")?.marker;
  const centerEast = markers.find(({ id }) => id === "mayakovskaya")?.marker;
  if (centerWest && centerEast) {
    const separate = () => {
      const distance = map.project(centerEast.getLngLat()).x - map.project(centerWest.getLngLat()).x;
      const gap = Math.max(0, (36 - distance) / 2);
      centerWest.setOffset([-gap, 0]);
      centerEast.setOffset([gap, 0]);
    };
    separate();
    map.on("zoomend", separate);
    map.on("resize", separate);
  }

  map.once("load", () => {
    root.dataset.mapReady = "";
    status.hidden = true;
    showCredits(credits);
  });
  map.on("error", () => {
    if (!("mapReady" in root.dataset)) status.textContent = "Карта не загрузилась. Маршруты доступны в карточках адресов.";
  });
}
