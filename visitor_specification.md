# Visitor Front-End — Modernization & Animation Specification

## 1. PURPOSE & OVERVIEW

This document specifies the front-end modernization plan for **all visitor-facing pages** — the public marketing site under `app/(public)/` — so the site feels **alive, maganda, modern, and smoothly animated** on both wide (desktop/tablet) and small (mobile) screens.

This is a companion document to `buyer_homepage_specification.md` §13 (which covers the shared homepage + buyer dashboard). Together they form the full front-end enhancement scope requested.

**Target Audience:** Unauthenticated visitors discovering Matthew Studio — evaluating the product, browsing categories, reading blog/tutorials, comparing plans, before ever creating an account.

**Primary Goal:** Every page transition, scroll, and interaction should feel deliberate and polished — never a static template — while staying fast on both wide and small screens.

---

## 2. PAGES IN SCOPE

All routes under `app/(public)/`:

| Page | Path | Priority |
|---|---|---|
| Homepage | `/` | Covered in `buyer_homepage_specification.md` §13 (shared) |
| Products (grid) | `/products` | High |
| Shop | `/shop` | High |
| Product detail | `/products/[slug]` equivalents (tshirts, templates, ai-videos, file-tools, game-characters, tutorials `[slug]`) | High |
| About | `/about` | Medium |
| Pricing | `/pricing` | High |
| How It Works | `/how-it-works` | Medium |
| Features | `/features` | Medium |
| Compare | `/compare` | Medium |
| Testimonials | `/testimonials` | Low |
| FAQ | `/faq` | Low |
| Blog (list + `[slug]`) | `/blog`, `/blog/[slug]` | Medium |
| Tutorials (list + `[slug]`) | `/tutorials`, `/tutorials/[slug]` | Medium |
| Contact | `/contact` | Medium |
| Support | `/support` | Low |
| Security | `/security` | Low |
| Terms / Privacy / Refund Policy | `/terms`, `/privacy`, `/refund-policy` | Low (legal — minimal motion) |

---

## 3. ANIMATION SYSTEM (shared across all pages)

**3.1 — Scroll entrance (mandatory on every section)**
- `framer-motion` `whileInView`, `viewport={{ once: true, margin: "-80px" }}`
- Pattern: `opacity: 0 → 1`, `translateY: 24px → 0` (desktop), `12px → 0` (mobile, ≤768px)
- Duration: `--transition-slow` (0.4s, `cubic-bezier(0.22, 1, 0.36, 1)`)
- Stagger children (cards, list items) by 60–80ms per index — never animate a grid of cards as one block.

**3.2 — Hover / focus states**
- Cards: lift (`translateY(-4px)`) + border/shadow soften, `--transition-base`
- Buttons/links: color + background transition on base state (not just `:hover`) so it reverses smoothly — `--transition-fast`
- All hover states mirrored on `:focus-visible` per Rule 33.3 (keyboard users get the same feedback)

**3.3 — Parallax**
- Background/decorative layers only (hero backgrounds, large section imagery): 0.10–0.20x scroll speed
- **Never** on readable text or foreground content
- Disabled entirely on mobile (≤768px) — replaced with a static background

**3.4 — Page transitions**
- Route changes: brief crossfade (150–200ms) via a shared layout transition wrapper — avoid jarring instant swaps between marketing pages
- Product detail modals/drawers (if used for quick-view): `--transition-slow` transform + opacity, matching the modal pattern already used elsewhere in the app

**3.5 — Carousels (blog, testimonials, media)**
- Reuse `hooks/useMediaCarousel.ts` — extend with crossfade + slight scale (0.98 → 1) between slides instead of a hard cut
- Swipeable on touch devices, arrow + dot controls on desktop

**3.6 — Reduced motion**
- Respect `prefers-reduced-motion: reduce` globally: drop all translateY/parallax/scale to opacity-only fades. Add this once as a shared `useReducedMotion()`-gated wrapper, not per-component.

**3.7 — Tokens (no new values introduced)**
All durations/easings/z-index/spacing reference the existing tokens in `app/globals.css` (`--transition-fast/base/slow`, `--z-*`, `--space-*`) per Rule 33. No hardcoded animation values in component CSS.

---

## 4. RESPONSIVE BEHAVIOR

- Mobile-first; breakpoints per `app/styles/mediaQueries.css` (480 / 768 / 1024 / 1280 / 1536)
- Touch targets ≥44×44px on all CTAs and nav items (Rule 29.1)
- Full-viewport sections use `100dvh`, never `100vh`
- Grids (`/products`, category pages) use `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` — no fixed column breakpoints needed
- Sticky nav gets `--z-sticky`; mobile menu drawer gets `--z-drawer` with slide-in transform (`--transition-slow`)

---

## 5. PERFORMANCE GUARDRAILS

- Animate only `transform` and `opacity` — never `width`/`height`/`top`/`left` (causes layout thrash)
- `will-change: transform` on actively-animating elements only, removed after animation settles
- Images via `next/image` with `priority` only on above-the-fold hero images (Rule 31.12)
- Lazy-mount below-the-fold carousels/heavy sections where feasible

---

## 6. PAGE-BY-PAGE NOTES

- **`/products`, `/shop`, category `[slug]` grids:** card stagger-in + hover lift is the highest-impact change (most-browsed pages)
- **`/pricing`:** plan cards stagger-in, "recommended" plan gets a subtle persistent glow/border-accent (not animated — static per Rule 17.7 no-decoration-color rule) rather than a distracting pulse
- **`/compare`:** table rows fade in on scroll, sticky header row on scroll within the table
- **`/blog`, `/tutorials` (list):** thumbnail hover zoom (`scale(1.03)`, clipped by `overflow: hidden` wrapper, per Rule 27.2 image container pattern)
- **`/contact`:** form field focus states per Rule 34.3 (autofocus, inline validation) — motion here stays minimal/functional, not decorative
- **Legal pages (`/terms`, `/privacy`, `/refund-policy`):** entrance fade only — no card motion, these are read-heavy

---

## 7. IMPLEMENTATION ORDER (proposed)

1. Shared motion primitives (scroll-entrance wrapper, reduced-motion hook, card hover mixin) — one-time setup
2. `/products`, `/shop`, category grids (highest traffic)
3. `/pricing`, `/compare`, `/how-it-works`
4. `/blog`, `/tutorials` (list + detail)
5. `/about`, `/features`, `/testimonials`, `/faq`, `/contact`, `/support`, `/security`
6. Legal pages (motion pass only, no structural change)

Per Rule 8A, each numbered step above ships as its own response/turn with full file delivery — not batched.

---

## 8. NOTES & KNOWN LIMITATIONS

- `framer-motion` is already a project dependency (`^12.43.0`) — no new packages required for this plan.
- Design tokens (colors, spacing, transitions, z-index) are already fully defined in `app/globals.css` — this plan only adds usage, not new tokens.
- Product/category imagery is currently placeholder — animation (hover zoom, card lift) will read better once real photography is in place, but is not blocked by it.

---

## 9. CHANGE LOG

| Date | Change |
|------|--------|
| 2026-09-03 | Initial visitor front-end modernization specification created — animation system, page scope, responsive/performance guardrails, and implementation order defined. |

---

**Document Version:** 1.0
**Last Updated:** 2026-09-03
**Status:** Specification Complete — awaiting confirmation before implementation begins
