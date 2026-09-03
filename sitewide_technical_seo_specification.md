# Site-Wide Technical & SEO Infrastructure — Feature Specification Document

## 1. PURPOSE & OVERVIEW

Unlike the product-area specs (buyer, admin, super-admin), this document
covers infrastructure that applies **across the entire site** — visitor,
buyer, admin, and super-admin alike. None of the four items below exist
in the repo today; there was no prior spec to extend.

Covers:
- 4.1 SEO Infrastructure (`sitemap.ts`, `robots.ts`)
- 4.2 Global Error Handling (root `not-found.tsx`, `error.tsx` boundaries)
- 4.3 Idle Session Timeout (Rule 32.5)
- 4.4 Anonymized Traffic Analytics (Rule 41)

---

## 2. ACCESS & AUTHENTICATION

- 4.1 and 4.2 are public — no auth involved.
- 4.3 applies per authenticated layout (buyer, admin, super-admin) —
  never the public visitor layout, since visitors have no session to
  time out.
- 4.4 is anonymous-only by design (Rule 41) — no session/PII involved,
  which is exactly why it needs no consent banner.

---

## 3. CURRENT STATE (verified against repo)

| Item | Found? |
|---|---|
| `app/sitemap.ts` | ❌ Not found |
| `app/robots.ts` | ❌ Not found |
| Root `app/not-found.tsx` | ❌ Not found (only per-product `[slug]/not-found.tsx` exist — random/mistyped URLs fall through to Next.js's default 404, unstyled) |
| Root or per-segment `error.tsx` | ❌ Not found anywhere in the repo |
| `useIdleTimeout` hook | ❌ Not found |
| Analytics/pageview service | ❌ Not found |

---

## 4. FEATURES (proposed, not yet built)

### 4.1 — SEO Infrastructure

**`app/sitemap.ts`**
- Generates entries for every static route (home, shop, pricing, blog
  index, contact, etc.) plus every dynamic product slug across all 6
  categories (templates, tshirts, ai-videos, file-tools, tutorials,
  game-characters) and every published blog post slug.
- `lastModified` pulled from each product/post's `updatedAt`.
- Excludes buyer/admin/super-admin routes entirely — public pages only.

**`app/robots.ts`**
- Allow all crawlers on public routes.
- Disallow `/buyer/`, `/admin/`, and the super-admin vault slug path
  explicitly — even though those are already auth-gated, keeping them
  out of the sitemap/robots file avoids leaking the existence of admin
  paths to crawlers.
- Points to the sitemap URL.

---

### 4.2 — Global Error Handling (Rule 31.10)

**`app/not-found.tsx`**
- Catches any URL that doesn't match a route — currently falls through
  to Next.js's unstyled default page.
- Branded 404: short message, search or category shortcuts, CTA back
  to `/shop`.

**`app/error.tsx`** (root-level Client Component)
- Catches unhandled render errors anywhere without a more specific
  boundary. Friendly message + "Try again" button calling `reset()`
  per the Rule 31.10 pattern already used elsewhere in the protocol —
  never a raw stack trace.

**Per-segment `error.tsx`** — recommended for `app/buyer/`,
`app/(public)/shop/`, and any route that does a data fetch, so a
failed fetch in one area doesn't blank the whole app.

---

### 4.3 — Idle Session Timeout (Rule 32.5)

- `hooks/useIdleTimeout.ts` — shared hook, tracks `mousemove`,
  `mousedown`, `keydown`, `scroll`, `touchstart`; fires `onIdle` after
  30 minutes of no activity (default).
- Applied inside `app/buyer/layout.tsx` (30 min) and, once built,
  `app/admin/layout.jsx` / `app/superAdmin/layout.tsx` — super-admin
  recommended at a shorter 15 min given the sensitivity of that area.
- On idle: call the logout endpoint (clears the HttpOnly session
  cookie), toast `"Your session expired due to inactivity."`, redirect
  to login. Must share the same origin-scoped termination logic as
  manual logout (Rule 44.4) — not a lighter version.

---

### 4.4 — Anonymized Traffic Analytics (Rule 41)

- `PageViewDaily` table — pre-aggregated counters only (date, path,
  viewCount, referrerHost, deviceType, countryCode). Raw IP is
  resolved to a country code in-memory and never written to any table
  or log, per Rule 41.1–41.2.
- `services/analytics.ts` → `recordPageView()` — shared helper,
  try/catch-wrapped, never breaks the request if logging fails.
- Beacon fires from a lightweight client component mounted in the
  public root layout only (never inside buyer/admin layouts — those
  get Account Activity Log instead, per Rule 42, a separate future
  item).
- Super-admin **Analytics** dashboard (`/superAdmin/analytics`): visits
  over time chart, top pages, top referrers, device breakdown,
  country-level list/map — reads only from `PageViewDaily`.
- No cookie banner needed for this specific feature (Rule 41.4) — but
  if per-visitor tracking (session replay, individual clickstream) is
  ever added later, that's explicitly a different, opt-in feature
  requiring its own Privacy Policy disclosure.

---

## 5. DATA MODEL

```prisma
model PageViewDaily {
  id           String   @id @default(cuid())
  date         DateTime @db.Date
  path         String
  viewCount    Int      @default(0)
  referrerHost String?
  deviceType   String?
  countryCode  String?
  createdAt    DateTime @default(now())

  @@unique([date, path, referrerHost, deviceType, countryCode])
}
```

No new tables needed for 4.1–4.3 — those are route files, a hook, and
a call to the existing logout endpoint.

---

## 6. TESTING & VERIFICATION CHECKLIST

- [ ] Visiting a nonexistent URL (e.g. `/this-does-not-exist`) shows the branded 404, not Next.js's default
- [ ] `google.com/search?q=site:` your domain shows real pages once `sitemap.ts` is live (post-deploy check)
- [ ] `/robots.txt` excludes `/buyer/`, `/admin/`, and the super-admin path
- [ ] Forcing a render error inside `app/buyer/` shows the branded error boundary with a working "Try again"
- [ ] Buyer session left idle 30+ minutes auto-logs out with the inactivity toast, not a silent redirect
- [ ] `PageViewDaily` rows increment on page load without ever storing a raw IP anywhere (grep the codebase for confirmation)
- [ ] All tests pass with `npx tsc --noEmit`

---

## 7. IMPLEMENTATION PRIORITY

1. **`not-found.tsx` + `error.tsx`** — cheapest, immediate UX/trust win
2. **`sitemap.ts` + `robots.ts`** — cheap, direct SEO impact
3. **Idle Session Timeout** — apply to `/buyer/` now; extend once admin/super-admin layouts exist
4. **Traffic Analytics** — slightly more work (table + service + dashboard), can trail the other three

---

## 8. CHANGE LOG

| Date       | Change |
|---|---|
| 2026-09-03 | Initial specification created — SEO infra (sitemap/robots), global error handling (not-found/error boundaries), idle session timeout, and anonymized traffic analytics. No prior spec existed for any of these; verified as missing directly against the repo. Spec-only — no code built yet. |

---

**Document Version:** 1.0
**Last Updated:** 2026-09-03
**Status:** Specification Complete — not yet built (none of Sections 4.1–4.4 exist in the repo)
