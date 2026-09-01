# Improvement 1 — Align Site to Digital Marketplace Positioning

## Context

The homepage has already been rebuilt for the multi-category marketplace pivot
(Templates, T-Shirts, AI Videos, File Tools, Tutorials, Game Characters — all
6 sections are wired into `app/(public)/page.tsx`). The rest of the site still
speaks "single resort-booking template," which creates a jarring mismatch the
moment a visitor clicks past the homepage. This doc lists what's out of sync
and the order to fix it in, one item per build turn.

---

## 1. Homepage metadata (quick win, site-wide impact) — DONE

**File:** `app/(public)/page.tsx`

- [x] `metadata.title`, `metadata.description`, and `openGraph` copy now
      describe the marketplace as a whole ("Templates, T-Shirts, AI Videos &
      Digital Products"), not just the resort booking template.

---

## 2. Shared chrome — NavBar / Footer — DONE

**Files:** `components/shared/NavBar.tsx`, `components/shared/Footer.tsx`

- [x] NavBar "Shop" link + both "Browse Marketplace" CTAs now point to
      `/products` (was `/shop`); nav label renamed "Shop" → "Products"
- [x] Footer link columns now generated from CATEGORY_SHOWCASE (Categories
      column) plus marketplace-wide Product/Company columns — no longer the
      old single-template page set.

## 2a. QuickWins.tsx homepage proof section — FIXED

- [x] Was 100% resort-template ("Trusted by resorts already running the
      template", resort wordmarks, resort booking stats). Replaced with
      marketplace-wide content: category chips instead of resort names,
      marketplace stats (18+ products / 6 categories / 48h delivery)
      instead of resort-booking metrics.

---

## 3. Old single-template pages — content mismatch

These pages still describe the resort-booking template specifically, not the
marketplace:

| Page            | Problem                                                                         | Direction                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~`/shop`~~     | ~~3-tier pricing (Managed/Self-hosted/Custom) is resort-template-only~~ **DONE** | Retired → redirects to new marketplace-wide `/pricing`. All site links repointed (see Section 4).                                             |
| ~~`/portfolio`~~ | ~~Case studies are all resort clients~~ **DONE** | Rebranded → `/case-studies`, redirects preserve old links. Each project now carries a `category` field (all "templates" today, genuinely) and a category badge shows on each card. |
| ~~`/features`~~     | ~~"Why choose this template" — tech stack framed around the resort booking system~~ **DONE** | Generalized to marketplace-wide tech stack / included-features / ROI calculator / DIY comparison — not resort-specific. |
| ~~`/how-it-works`~~ | ~~Onboarding steps are per pricing tier of the resort template~~ **DONE** | Clearly separated: page scoped to Templates onboarding only, with a note linking to the homepage's universal 3-step (Browse/Choose/Start) flow for other categories. |
| ~~`/testimonials`~~ | ~~Resort-owner quotes only~~ **DONE** | Kept as a Templates-specific quote grid (case-study clients), with a note linking to the homepage's marketplace-wide testimonials carousel. |
| ~~`/contact`~~      | ~~Tier-select dropdown is resort-tier-only~~ **DONE** | Now asks which category a visitor is interested in; the Templates tier field only shows once Templates is picked. |

---

## 4. Missing pages (from the marketplace site map, not yet built)

- [x] `/products` — master grid (filter/sort/search), pulls from
      `lib/productsData.ts` (already has 21 products across all 6 categories
      — currently unused except in the homepage carousel)
- [x] 6 category pages: `/templates`, `/tshirts`, `/ai-videos`,
      `/file-tools`, `/tutorials`, `/game-characters`
- [x] Product detail pages per category (`[slug]`, variant selectors)
- [x] `/pricing` — marketplace-wide pricing (distinct from `/shop`,
      which now redirects here). Reuses categoryShowcaseData.ts so
      figures match the homepage.
- [x] `/compare` — marketplace-wide variant comparison tool. 3
      search-to-add slots (any category), comparison table with
      category/rating/price/badge/description, plus a Variants row for
      Templates products that have variant breakdowns.
- [x] `/faq` — redirects to `/support`, which already has a searchable,
      category-grouped FAQ accordion; no separate page needed, keeps
      one FAQ source of truth instead of two.
- [x] `/about` — mission intro, category grid (reuses CATEGORY_SHOWCASE),
      3 value pillars, linked from Footer's Company column.
- [x] `/security`, `/privacy`, `/terms`, `/refund-policy` — needed before any
      real checkout/payment flow goes live

---

## 5. Suggested build order

1. Homepage metadata + NavBar/Footer copy — smallest change, fixes the most
   visible mismatch (SEO + first impression)
2. `/products` master grid — unlocks reuse of the already-built
   `lib/productsData.ts` and gives the 6 category sections somewhere to link to
3. 6 category pages (`/templates`, `/tshirts`, `/ai-videos`, `/file-tools`,
   `/tutorials`, `/game-characters`)
4. Retire/rename `/shop` → `/pricing`, rebrand `/portfolio` → `/case-studies`
5. Update `/features`, `/how-it-works`, `/testimonials`, `/contact` copy
6. `/compare`, `/faq`, `/about`
7. Legal pages: `/security`, `/privacy`, `/terms`, `/refund-policy`

Each item ships as its own turn — build, deliver, confirm before moving to
the next — per the project's existing workflow.
