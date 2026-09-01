# Improvement 1 — Align Site to Digital Marketplace Positioning

## Context

The homepage has already been rebuilt for the multi-category marketplace pivot
(Templates, T-Shirts, AI Videos, File Tools, Tutorials, Game Characters — all
6 sections are wired into `app/(public)/page.tsx`). The rest of the site still
speaks "single resort-booking template," which creates a jarring mismatch the
moment a visitor clicks past the homepage. This doc lists what's out of sync
and the order to fix it in, one item per build turn.

---

## 1. Homepage metadata (quick win, site-wide impact)

**File:** `app/(public)/page.tsx`

- `metadata.title` is still `"Matthew Studio | Resort Booking Website Templates"`
- `metadata.description` and `openGraph.description` still describe only the
  resort booking template ("multi-room booking, promos, admin dashboard —
  live in 48 hours")
- None of this mentions the other 5 categories (T-Shirts, AI Videos, File
  Tools, Tutorials, Game Characters) even though the page content does

**Fix:** rewrite title/description/OG copy to describe the marketplace as a
whole, not just the resort template.

---

## 2. Shared chrome — NavBar / Footer

**Files:** `components/shared/NavBar.tsx`, `components/shared/Footer.tsx`

- Confirm nav links point at marketplace destinations (or at least don't
  imply "this whole site is one resort template")
- Footer link set should reflect the marketplace, not just the old page set

---

## 3. Old single-template pages — content mismatch

These pages still describe the resort-booking template specifically, not the
marketplace:

| Page            | Problem                                                                         | Direction                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `/shop`         | 3-tier pricing (Managed/Self-hosted/Custom) is resort-template-only             | Either rename to "Templates pricing" explicitly, or retire in favor of `/pricing` (marketplace-wide) once it exists                           |
| `/portfolio`    | Case studies are all resort clients                                             | Rebrand as `/case-studies` with category tags per `MARKETPLACE_IMPROVEMENTS.md` Section 3                                                     |
| `/features`     | "Why choose this template" — tech stack framed around the resort booking system | Generalize, or split into a per-category version                                                                                              |
| `/how-it-works` | Onboarding steps are per pricing tier of the resort template                    | Check against the universal 3-step (Browse/Choose/Start) already on the homepage; reconcile or clearly separate audiences                     |
| `/testimonials` | Resort-owner quotes only                                                        | Decide: merge with homepage's marketplace-wide testimonials, or keep as a resort-template-specific page and link it clearly from `/templates` |
| `/contact`      | Tier-select dropdown is resort-tier-only                                        | Update options once other categories have their own tiers/pricing                                                                             |

---

## 4. Missing pages (from the marketplace site map, not yet built)

- [ ] `/products` — master grid (filter/sort/search), pulls from
      `lib/productsData.ts` (already has 21 products across all 6 categories
      — currently unused except in the homepage carousel)
- [ ] 6 category pages: `/templates`, `/tshirts`, `/ai-videos`,
      `/file-tools`, `/tutorials`, `/game-characters`
- [ ] Product detail pages per category (`[slug]`, variant selectors)
- [ ] `/pricing` — marketplace-wide pricing (distinct from `/shop`, which is
      still the old single-template 3-tier page)
- [ ] `/compare` — variant comparison tool
- [ ] `/faq`, `/about`
- [ ] `/security`, `/privacy`, `/terms`, `/refund-policy` — needed before any
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
