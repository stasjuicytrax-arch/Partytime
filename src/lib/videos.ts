// Видео из Kinescope: content/videos.json (зал → id, обзоры локаций) + content/videos-meta.json
// (пропорции и постеры, собирает scripts/fetch-video-meta.mjs). Плеер грузится только по клику.
import videos from "../../content/videos.json";
import meta from "../../content/videos-meta.json";
import { rooms } from "./rooms";

export interface Video {
  id: string;
  /** пропорции ролика (ширина / высота) */
  w: number;
  h: number;
  poster: string;
}
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const M = meta as Record<string, { w: number; h: number; poster: string | null }>;

function video(id: string, fallback: string): Video {
  const m = M[id] ?? { w: 9, h: 16, poster: null };
  // нет постера Kinescope — первое фото зала
  return { id, w: m.w, h: m.h, poster: m.poster ? `${BASE}/${m.poster}` : fallback };
}

const R = videos.rooms as Record<string, string>;
export const roomVideo = (slug: string): Video | null => {
  const r = rooms.find((x) => x.slug === slug);
  return R[slug] && r ? video(R[slug], r.images[0].src) : null;
};
export const hasVideo = (slug: string) => slug in R;

/** обзоры локаций: только те, что есть в videos.json (у Маяковской пока нет) */
export const overviews = Object.entries(videos.overview as Record<string, { title: string; id: string; duration: string }>).map(
  ([loc, o]) => {
    const first = rooms.find((r) => r.loc === loc)!;
    return { loc, title: o.title, duration: o.duration, ...video(o.id, first.images[0].src) };
  }
);
