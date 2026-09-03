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

## 7. IMPLEMENTATION ORDER

1. ✅ **Done (2026-09-03)** — Shared motion primitives (scroll-entrance wrapper, reduced-motion hook, card hover mixin)
2. ✅ **Done (2026-09-03)** — `/products`, `/shop`, category grids: `/products` done; `/shop` is a retired redirect to `/pricing` (nothing to animate there); `tshirts`, `templates`, `ai-videos`, `file-tools`, `game-characters`, `tutorials` category grids all wired to the shared `ScrollReveal` primitive
3. ✅ **Done (2026-09-03)** — `/pricing`, `/compare`, `/how-it-works` all wired. **Implementation Order Step 3 complete.**
4. ✅ **Done (2026-09-03)** — `/blog`, `/tutorials` (list + detail) were already fully wired prior to this audit; verified, not newly built. **Implementation Order Step 4 complete.**
5. ✅ **Done (2026-09-03)** — `/testimonials`, `/faq`, `/contact`, `/support`, `/security` all wired (`/about` and `/features` already done — see correction above). **Implementation Order Step 5 complete.**
6. ✅ **Done (2026-09-03)** — Legal pages: covered as a side effect of Step 5's `/security` work, since `/terms`, `/privacy`, and `/refund-policy` all share `components/legal/LegalDocument.tsx`. **Implementation Order Step 6 complete — full page-by-page rollout finished.**

Per Rule 8A, each numbered step above ships as its own response/turn with full file delivery — not batched.

---

## 8. NOTES & KNOWN LIMITATIONS

- `framer-motion` is already a project dependency (`^12.43.0`) — no new packages required for this plan.
- Design tokens (colors, spacing, transitions, z-index) are already fully defined in `app/globals.css` — this plan only adds usage, not new tokens.
- Product/category imagery is currently placeholder — animation (hover zoom, card lift) will read better once real photography is in place, but is not blocked by it.
- **Implemented (2026-09-03):** `components/shared/ScrollReveal.tsx` — the shared scroll-entrance wrapper (§3.1, §3.6). Wired into `/products` (`components/products/ProductsGrid.tsx`) with per-card stagger, capped at 8 cards' worth of delay so long result sets don't drag out the entrance.
- **Correction (2026-09-03):** the `.productCard` hover claim above was inaccurate — it was still box-shadow-only in `app/styles/shared.css`. Now actually switched to `transform: translateY(-4px)` + border/background brighten, matching Rule 17.7 (shadows are for floating elements only). Since `.productCard` is shared, this fix applies to every product grid site-wide, not just `/products`.
- **Implemented (2026-09-03):** `/shop` was checked and confirmed to be a retired route (`redirect("/pricing")`, no grid rendered there) — nothing to animate, spec's page list is stale on this entry.
- **Implemented (2026-09-03):** `tshirts` category grid — `components/home/TShirtsSection.tsx` (powers both the homepage T-Shirts section and `/tshirts`) now wraps its `productCardsGrid` in `ScrollReveal` with the same 0.06s/8-card stagger as `/products`.
- **Implemented (2026-09-03):** `templates` category grid — `components/home/TemplatesSection.tsx` (powers both the homepage Templates section and `/templates`) now wraps its `productCardsGrid` in the same `ScrollReveal` stagger. The section's comparison table, feature grid, "why us" cards, and demo video carousel already had their own entrance motion from before this pass — only the trailing product grid was missing it.
- **Implemented (2026-09-03):** `ai-videos` category grid — `components/home/AIVideosSection.tsx` (powers both the homepage AI Videos section and `/ai-videos`) now wraps its `productCardsGrid` in the same `ScrollReveal` stagger.
- **Note on remaining grids:** `GameCharactersSection.tsx` and `FileToolsSection.tsx` currently have no scroll-entrance animation on their product cards at all. `TutorialsSection.tsx` already has its own hand-rolled stagger (raw `motion.div`, grouped by course level) but doesn't check `prefers-reduced-motion` the way `ScrollReveal` does — worth normalizing to the shared primitive rather than leaving it as a one-off, per this doc's own "never a one-off animation per component" rule (§3.1).
- **Implemented (2026-09-03):** `file-tools` category grid — `components/home/FileToolsSection.tsx` (powers both the homepage File Tools section and `/file-tools`) now wraps its `productCardsGrid` in the same `ScrollReveal` stagger. This was one of the two grids with no entrance animation at all before this pass.
- **Implemented (2026-09-03):** `game-characters` category grid — `components/home/GameCharactersSection.tsx`'s `productCardsGrid` (the bottom product-card row, tagged Rigged/Modular/Low-poly) now wraps each `gameCharacterCardWrap` (badge + `ProductCard`) in `ScrollReveal`. The character-thumbnail gallery above it already had its own stagger/scale entrance from before this pass and was left untouched — only the trailing product grid was missing motion.
- **Implemented (2026-09-03):** `tutorials` category grid — `components/home/TutorialsSection.tsx`'s hand-rolled `motion.div` stagger (raw `initial`/`whileInView`/`transition`, no reduced-motion handling) was replaced with `ScrollReveal`, preserving the same "stagger by level group" delay formula (`groupIndex * 0.15 + itemIndex * 0.05`) called for by the section's own design intent — it now also respects `prefers-reduced-motion` for free via the shared primitive. **This completes category-grid coverage for all six categories** — every `productCardsGrid` across the visitor site now uses the same `ScrollReveal` component.
- **Simplification vs. §3.1:** mobile translateY distance is not yet reduced to 12px separately from desktop's 24px — both currently use 24px. Low-risk, can be tightened in a follow-up pass if it feels heavy on small screens.
- **Implemented (2026-09-03):** `/pricing` — `app/(public)/pricing/page.tsx` now wraps the header, the six category pricing cards (0.06s stagger via `ScrollReveal`, same cadence as `/products`), and the closing note section in `ScrollReveal`. Card hover-lift (`translateY(-4px)`) already existed in `pricing.css` before this pass and needed no change. This page has no "recommended" plan concept (it's category cards, not plan tiers), so §6's glow/border-accent note doesn't apply here — that note is more relevant if/when a dedicated plan-tier pricing view is built.
- **Implemented (2026-09-03):** `/compare` — header wrapped in `ScrollReveal` (`app/(public)/compare/page.tsx`); the 3-slot picker grid wrapped in `ScrollReveal` and the comparison table's `<tbody>` rows given a 0.06s-staggered fade+slide-up via `motion.tr` directly (`ScrollReveal`'s `div` wrapper is invalid HTML inside a `<tbody>`, so the same animation values were applied by hand, including the `prefers-reduced-motion` check) — all in `components/compare/ProductCompareTool.tsx`. Per §6's "sticky header row on scroll within the table": `compareTableWrapper` now has `max-height: 60vh` + `overflow: auto` and `thead th` is `position: sticky; top: 0` with an opaque `--color-bg` background, so the header pins within the table's own scroll area rather than guessing at the site nav's pixel height for a page-level sticky offset.
- **Implemented (2026-09-03):** `/how-it-works` — header and closing note wrapped in `ScrollReveal` (`app/(public)/how-it-works/page.tsx`). In `components/how-it-works/OnboardingFlow.tsx`, the tab list + timeline section (`.onboardingSectionInner`, kept nested inside the real `<section>` tag rather than replaced by it, per Rule 23.1) now gets a scroll-entrance via `ScrollReveal`. Separately, the per-tier step list — which already had a tab-switch crossfade via `AnimatePresence` — previously animated all its `<li>` steps as one flat opacity block; converted to `framer-motion` `variants` with `staggerChildren: 0.06` so each step now fades+slides in individually on tab switch, matching §3.1's "never animate a list as one block" rule, with `useReducedMotion` respected on the per-step slide distance. **Implementation Order Step 3 (`/pricing`, `/compare`, `/how-it-works`) is now complete.**
- **Audit correction (2026-09-03):** `/about` and `/features` were found already wired with `ScrollReveal` (header, staggered cards, closing note) — done in an earlier untracked pass, not part of Step 3's work. Moved out of Step 5's pending list; only `/testimonials`, `/faq`, `/contact`, `/support`, `/security` remain for that step.
- **Audit correction (2026-09-03):** `/blog` and `/tutorials` (list + detail) were found already wired, not pending as this doc previously stated. `/blog` list (`BlogGrid.tsx`) and `/blog/[slug]` (`TutorialDetail.tsx`, fade-only per §6's read-heavy treatment) both use `ScrollReveal`. `/tutorials` list reuses `TutorialsSection.tsx` (already normalized to `ScrollReveal` per the category-grid pass above). `/tutorials/[slug]` renders the shared `components/products/ProductDetail.tsx`, which also already has `ScrollReveal` + a `motion.li`-staggered "More in this category" strip — and since that component is shared, `tshirts`, `templates`, `ai-videos`, `file-tools`, and `game-characters` detail pages are covered by the same fix. **Implementation Order Step 4 is complete — no code changes were needed, only verification.**
- **Implemented (2026-09-03):** `/testimonials` — header and closing note wrapped in `ScrollReveal` (`page.tsx`). `TestimonialGrid.tsx`'s per-card stagger normalized from a hand-rolled `motion.article` (no reduced-motion handling) to `ScrollReveal`. Also added the §3.2 hover-lift (`translateY(-4px)`) to `.testimonialCard` in `testimonials.css`, which previously only had a background/border hover — same gap as the earlier `.productCard` fix.
- **Implemented (2026-09-03):** `/faq` was checked and confirmed to be a retired route (`redirect("/support")`, no content rendered there) — nothing to animate, same pattern as `/shop`.
- **Implemented (2026-09-03):** `/contact` — header and the calendar-booking block wrapped in `ScrollReveal` (`page.tsx`), per §6's explicit note for this page: motion stays minimal/functional. `ContactForm.tsx`'s own field states were left untouched — no stagger or card motion added to the form itself.
- **Implemented (2026-09-03):** `/support` — page header wrapped in `ScrollReveal` (`page.tsx`). `SupportFaqAccordion.tsx`'s heading and per-item stagger (previously hand-rolled `motion.div`, no reduced-motion handling) normalized to `ScrollReveal`; the expand/collapse answer animation and chevron rotate are untouched since those are interaction motion, not scroll entrance. `SupportForm.tsx` left untouched, same minimal/functional treatment as `/contact`.
- **Implemented (2026-09-03):** `/security` — `components/legal/LegalDocument.tsx` (shared by all 4 legal pages) now wraps its whole document in a single fade-only `ScrollReveal`, per §6's "entrance fade only — no card motion, read-heavy" rule. Because `/terms`, `/privacy`, and `/refund-policy` all render this same component, this one change completes Step 5's `/security` item **and** all of Step 6 in the same pass — no separate work needed for the legal pages.
- **Full page-by-page rollout complete (2026-09-03):** every page in §2's scope now has the motion treatment its priority/type calls for. Remaining open items are the cross-cutting §3 system pieces noted above (mobile translateY distance, §3.4 page transitions, §3.5 carousel crossfade) — none of which are tied to a specific page in the Implementation Order.

---

## 9. CHANGE LOG

| Date | Change |
|------|--------|
| 2026-09-03 | Initial visitor front-end modernization specification created — animation system, page scope, responsive/performance guardrails, and implementation order defined. |
| 2026-09-03 | Implemented shared `ScrollReveal` motion primitive + applied scroll-entrance stagger and hover-lift to `/products` grid (`ProductsGrid.tsx`, `ProductCard` via `shared.css`). Step 1 and the first half of Step 2 of the Implementation Order are done. |
| 2026-09-03 | Confirmed `/shop` is a retired redirect (nothing to implement there). Fixed `.productCard` hover in `shared.css` to actually match the translateY-lift pattern (previous entry's claim was stale — it was still box-shadow-only). Wired `ScrollReveal` stagger into the `tshirts` category grid (`TShirtsSection.tsx`). Remaining category grids (`templates`, `ai-videos`, `file-tools`, `game-characters`, `tutorials`) still pending. |
| 2026-09-03 | Wired `ScrollReveal` stagger into the `templates` category grid (`TemplatesSection.tsx`). Remaining category grids (`ai-videos`, `file-tools`, `game-characters`, `tutorials`) still pending. |
| 2026-09-03 | Wired `ScrollReveal` stagger into the `ai-videos` category grid (`AIVideosSection.tsx`). Noted that `GameCharactersSection.tsx`/`FileToolsSection.tsx` have no entrance animation yet and `TutorialsSection.tsx` has a one-off hand-rolled stagger that should be normalized to `ScrollReveal`. Remaining: `file-tools`, `game-characters`, `tutorials`. |
| 2026-09-03 | Wired `ScrollReveal` stagger into the `file-tools` category grid (`FileToolsSection.tsx`). Remaining: `game-characters`, `tutorials`. |
| 2026-09-03 | Wired `ScrollReveal` stagger into the `game-characters` category grid's product row (`GameCharactersSection.tsx`) — the character-thumbnail gallery above already had its own entrance and was left as-is. Remaining: `tutorials`. |
| 2026-09-03 | Normalized `tutorials` category grid (`TutorialsSection.tsx`) from its hand-rolled `motion.div` stagger to the shared `ScrollReveal` primitive, keeping the same per-level-group delay formula and gaining reduced-motion support. **All six category grids now use `ScrollReveal` — Implementation Order Step 2 is complete.** |
| 2026-09-03 | Wired `ScrollReveal` into `/pricing` (`app/(public)/pricing/page.tsx`) — header, 6-card category grid (0.06s stagger), and closing note section. Existing hover-lift in `pricing.css` was already correct. Implementation Order Step 3: `/pricing` done, `/compare` and `/how-it-works` still pending. |
| 2026-09-03 | Wired motion into `/compare` — header via `ScrollReveal`, slot-picker grid via `ScrollReveal`, comparison table rows via staggered `motion.tr` (0.06s/row, reduced-motion aware), and a sticky `thead` pinned within a newly bounded `max-height: 60vh` scroll area on `compareTableWrapper`. Implementation Order Step 3: `/pricing` and `/compare` done, `/how-it-works` still pending. |
| 2026-09-03 | Wired motion into `/how-it-works` — header + closing note via `ScrollReveal` (`page.tsx`); `OnboardingFlow.tsx`'s tab list/timeline section via `ScrollReveal`, and its per-tier step list converted from a flat single-block fade to a `staggerChildren`-based per-step fade+slide on tab switch. **Implementation Order Step 3 is now fully complete** (`/pricing`, `/compare`, `/how-it-works`). |
| 2026-09-03 | Audit: `/about` and `/features` found already wired with `ScrollReveal` (untracked prior pass) — corrected Step 5's pending list. `/blog` and `/tutorials` (list + detail, plus the shared `ProductDetail.tsx` used by all other category `[slug]` pages) also found already wired — **Implementation Order Step 4 confirmed complete**, no code changes needed. Next: Step 5 — `/testimonials`, `/faq`, `/contact`, `/support`, `/security`. |
| 2026-09-03 | Wired Step 5 — `/testimonials` (header/note `ScrollReveal`, card grid normalized off hand-rolled `motion.article`, added missing hover-lift), `/faq` confirmed a retired redirect, `/contact` (header/calendar block only, form left functional-only), `/support` (header + `SupportFaqAccordion.tsx` heading/item stagger normalized to `ScrollReveal`), and `/security` via a single fade-only `ScrollReveal` in the shared `LegalDocument.tsx` — which also completes Step 6, since `/terms`, `/privacy`, and `/refund-policy` share that same component. **Implementation Order Steps 5 and 6 are now complete — full page-by-page rollout finished.** Remaining work is limited to cross-cutting §3 system items (mobile translateY distance, page transitions, carousel crossfade) not tied to any specific page. |

---

**Document Version:** 2.2
**Last Updated:** 2026-09-03
**Status:** Page-by-page rollout complete — Steps 1–6 all done. Every page in §2's scope has its called-for motion treatment. Remaining work is limited to the cross-cutting §3 system items not tied to a specific page: mobile translateY distance simplification (§3.1), page transitions (§3.4), and carousel crossfade (§3.5).
