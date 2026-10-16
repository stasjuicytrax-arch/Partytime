# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro 5 + TypeScript, plain CSS on `brand/tokens.css` (no Tailwind), GSAP + ScrollTrigger, Lenis, SplitType, Three.js (variant B only, lazy). Static build, deployed to GitHub Pages from `main` (`docs/TZ.md` §2).

## Users

Guests aged 18–45 planning a group occasion in Saint Petersburg: birthdays, hen and stag parties, corporate evenings, dates, karaoke nights — plus parents organising children's parties. Most arrive on a phone, compare rooms by theme, size and price, and want to book quickly.

## Product Purpose

Party Time is a network of karaoke lofts: themed private rooms rented by the hour. The landing replaces an overloaded Tilda site. Success: the visitor picks a room and submits a booking request in about three clicks, and stays engaged for 3+ minutes browsing rooms and galleries. The primary conversion is the step-by-step booking form (a manager calls back); phone and messengers are fallback channels.

## Positioning

36 themed worlds at two central locations (Думская, Маяковская), each rented whole to one company — no strangers, own food allowed with no corkage, open until 06:00 on Fri–Sat.

## Operating Context

The site is presented to the client's management; visual quality matters most. Bookings currently land in RestoPlace; integration method is undecided, so submission is isolated in `src/lib/lead.ts`. Two more locations (Ленинский, Комендантский) are shown as disabled "скоро на сайте" buttons.

## Capabilities and Constraints

- Room catalogue built only from `content/rooms.json`; facts (prices, hours, phones) only from `content/`. Missing facts are marked `[уточнить]`, never invented.
- Pages Кухня & Бар, Услуги, Акции are not built; they link to `/soon`.
- SEO groundwork now (semantics, JSON-LD, sitemap), keywords later.
- Room names referencing franchises stay as names; no third-party logos or characters in graphics.

## Brand Commitments

- Name Party Time; slogan «Пространство для праздника»; headline voice «ВМЕСТЕ И ГРОМЧЕ». Russian, «на вы», short, playful.
- Logos only from `brand/logo/`, never recoloured or distorted (black letters on white plate with black frame).
- No outline mascot figures from the brandbook.
- Fonts: Unbounded (display), Onest (text), handwritten accent (Caveat). Visual rules live in `docs/DESIGN_SYSTEM.md`.

## Evidence on Hand

- Room data and photos: `content/rooms.json`, `public/img/rooms/` (Маяковская rooms have one photo each, no area/exact capacity).
- Guest photos by Roman Bastrikov: `Photo/`.
- Five short reviews in `content/content.md` §8 — use only these, no invented testimonials.
- Style references: `Referens/`.

## Product Principles

1. Book in three clicks: every screen leads to a room or the form.
2. Rooms are the product — real photos and themes over decoration.
3. Loud but usable: the expression never hides price, size or the CTA.
4. Truth over filler: no invented numbers, reviews or claims.

## Accessibility & Inclusion

WCAG AA contrast, keyboard access, focus-trapped modals, full `prefers-reduced-motion` support, mobile 375px without horizontal overflow, touch targets ≥ 48px.
