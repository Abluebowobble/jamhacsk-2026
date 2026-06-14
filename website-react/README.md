# Hestia marketing site (React)

A creative, motion-forward rebuild of the Hestia marketing site in **React + Vite + Tailwind v4**,
keeping the product's "Clinical Precision" brand DNA (burnt-orange on near-white, Inter / JetBrains Mono).

## Stack
- **Vite 6** + **React 19**
- **Tailwind v4** (`@tailwindcss/vite`) — design tokens ported into `@theme` in `src/index.css`,
  mirroring `frontend/src/index.css`.
- **react-router-dom 7** — routes `/` (landing) and `/download`.
- **motion** (Framer Motion) — declarative reveals, stagger, count-up, parallax, hover.
- **gsap** + **ScrollTrigger** — the pinned, scroll-scrubbed "safety loop" centerpiece in the How section.
- **lenis** — smooth scroll (disabled under `prefers-reduced-motion`).

## Run
```bash
npm install
npm run dev      # http://localhost:5174
npm run build
npm run preview
```

## Structure
- `src/components/ui.jsx` — primitives (Button, Pill, Card, Section, Container, Eyebrow, IconTile…).
- `src/components/` — Nav, Footer, BrandMark, SectionHead.
- `src/components/sections/` — one component per landing section.
- `src/lib/motion.jsx` — `Reveal`, `Stagger`, `CountUp` (all reduced-motion aware, with a
  visibility fallback so content never stays hidden if a reveal doesn't fire).
- `src/lib/icons.jsx` — inline SVG icon set.
- `src/pages/` — `Landing.jsx`, `Download.jsx` (preserves the NFC `?device_id=` deep-link + standalone redirect).

Accessibility: every animation honors `prefers-reduced-motion`; status is always color **+ icon + text**;
focus-visible rings throughout.

This lives alongside the old static `website/` so you can compare; swap it in when ready.
