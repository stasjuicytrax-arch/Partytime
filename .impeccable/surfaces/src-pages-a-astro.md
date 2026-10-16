---
version: 1
slug: "src-pages-a-astro"
primary_target: "src/pages/a.astro"
related_targets: []
---

# Surface: variant A «Поп-коллаж» (/a) — hero + rooms catalog

Mode: Persuade. Visitor: a company of 18–45 (or a parent) choosing where to celebrate, mostly on a phone. Action: pick a room → open it → «Забронировать этот зал». Proof: real room photos, real prices from rooms.json, real guest photos (cutouts). Direction pinned by docs/TZ.md §3 step 1 and docs/DESIGN_SYSTEM.md; no concept roll (brief-pinned). Build path: code-led (no image generation).

## Direction contract

THESIS: The site is a party flyer pasted together by hand — a print collage, not a SaaS hero. Refuses the centered headline + stock photo + 3 feature cards arrangement.

OWN-WORLD: Hot pink and warm paper fields meeting edge to edge, black 2px sticker outlines, hard offset ink shadows, lime as the only action colour, Unbounded 900 caps, Caveat handwriting on doodle arrows, grain over colour, cut-out guests on tilted saffron/sky/violet plates.

STORY: Visitor sees people singing in a loud room → understands «whole themed room for your company, till 06:00, from 1 250 ₽» → scrolls into the catalogue, filters by location and group size, opens a room, books it.

FIRST VIEWPORT: Pink field. «ВМЕСТЕ / И ГРОМЧЕ» at ~11vw across the full width; cut-out guests on tilted plates sit behind and in front of the letters; lime stars, rotating stamp, doodle arrow «тут поют до 6 утра →». Lead + lime CTA «Выбрать зал» + secondary «Подобрать праздник» bottom-left; fact stickers along the right. Logo on its white plate in the header.

FORM: Pinned brief variant A (TZ §3, step 1), seed: brief-pinned.

Signature interaction: the collage slaps together on load (back.out), layers parallax on pointer, stickers draggable; catalogue polaroids scrub photos with the cursor.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
