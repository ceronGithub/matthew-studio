# Infrastructure & Operations — Feature Specification Document

## 1. PURPOSE & OVERVIEW

Third-pass audit, deeper into infra/ops territory rather than
user-facing product gaps. Covers four items with no existing spec and
no existing code, verified directly against the repo:

- 4.1 CI/CD Pipeline
- 4.2 Error Tracking & Monitoring
- 4.3 Security Headers / CSP
- 4.4 Blog CMS (admin write access)

None of these block launch on their own, but 4.2 and 4.3 matter a lot
more once real payments (`cart_checkout_specification.md`) are live —
you want to know immediately if checkout breaks, and you want baseline
header hardening before real card-adjacent traffic flows through the
app.

---

## 2. ACCESS & AUTHENTICATION

- 4.1 and 4.2 are dev-tooling/ops — no user-facing auth.
- 4.3 applies globally, enforced at the framework/middleware level —
  no per-user auth involved.
- 4.4 (Blog CMS) is admin/super-admin only, sits under the existing
  admin route guard (Rule 31.11) — this is an *addition* to
  `admin_account_specification.md` / `super_admin_account_specification.md`'s
  CMS section, not a new standalone account area.

---

## 3. CURRENT STATE (verified against repo)

| Item | Found? |
|---|---|
| `.github/workflows/` (any CI config) | ❌ Not found |
| Sentry or any error-tracking SDK in `package.json` | ❌ Not found |
| Security headers (`headers()` in `next.config.*`, or CSP in `middleware.ts`) | ❌ Not found |
| Blog post management in `app/admin/` or `app/superAdmin/` | ❌ Not found — blog content is currently static/hardcoded |
| `npm run test` script | ❌ Not found — only `dev`, `build`, `start`, `lint` exist |
| Contact form backend | ✅ Found (`app/api/contact`) — working already |
| `next/image` usage (no raw `<img>`) | ✅ Confirmed — Rule 27 already followed correctly |

---

## 4. FEATURES (proposed, not yet built)

### 4.1 — CI/CD Pipeline

**`.github/workflows/ci.yml`** — runs on every push/PR:
1. `npm install`
2. `npx tsc --noEmit` (Rule 20 — this is currently a manual pre-delivery
   step Claude runs; CI makes it enforced automatically, not just
   Claude-checked)
3. `npm run lint`
4. `npm run test` (once 4.7 from `additional_platform_gaps_specification.md`
   exists — CI job stays a no-op stub until then, never fails the
   build for a missing test script)

**`.github/workflows/database-backup.yml`** — already speced
separately in the operational protocol's Backup & Disaster Recovery
section (Rule 40.5) — cross-referenced here, not duplicated.

**Deploy step:** if hosted on Vercel, this is likely already automatic
on push to `main` via Vercel's own GitHub integration — confirm before
building a redundant custom deploy workflow.

---

### 4.2 — Error Tracking & Monitoring

- Add Sentry (`@sentry/nextjs`) — captures unhandled exceptions from
  both the root `error.tsx` boundary (`sitewide_technical_seo_specification.md`
  Section 4.2) and API route handlers.
- Server-side and client-side DSN configured via env vars (server DSN
  has no `NEXT_PUBLIC_` prefix requirement issue since Sentry's public
  DSN is designed to be public — confirm against Sentry's own docs,
  it's not a secret the way API keys are).
- Wire into the existing `error.tsx` boundary's `reset()` handler so
  every caught render error also reports to Sentry, not just PayMongo
  webhook failures or security events (which already log via
  `logSecurityEvent`, Rule 38 — Sentry is for *application* errors,
  SecurityLog stays for *security* events; don't merge the two).
- Alerting: Sentry's own alert rules (email/Slack) — no custom
  notification system needed.

---

### 4.3 — Security Headers / CSP

Add to `next.config.mjs`:

```js
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; img-src 'self' data: https://*.r2.dev https://*.supabase.co; " +
            "script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.paymongo.com;",
        },
      ],
    },
  ];
}
```

- Exact CSP directive values need to be finalized against every
  external domain actually used (Supabase, Cloudflare R2, PayMongo,
  EmailJS's endpoint if it makes direct calls) — the above is a
  starting point, not final.
- Test thoroughly after adding — an overly strict CSP silently breaks
  things (blocked images, blocked scripts) with no obvious error
  message to the end user, only in the browser console.

---

### 4.4 — Blog CMS (Admin Write Access)

**Content:**
- `/admin/blog` (or `/superAdmin/blog` depending on which spec's role
  boundary this lands under — confirm against
  `admin_account_specification.md`'s existing CMS section before
  building, this may already be scoped there and just not built yet)
- List existing posts, Create/Edit form (title, slug, cover image via
  Cloudflare R2 upload per Rule 35.6, body — rich text or Markdown
  editor, published/draft toggle, publish date)
- Slug auto-generated from title, editable before first publish, never
  after (breaks existing links/SEO)
- Draft posts never appear in `app/sitemap.ts`
  (`sitewide_technical_seo_specification.md` Section 4.1) or the
  public blog index until published

---

## 5. DATA MODEL

Blog posts likely already have a model/data source (since blog pages
currently render *something*, just not admin-editable) — confirm
whether they're in a `BlogPost` Prisma table already or in a static
data file (`lib/blogData.ts`-style, matching the `productsData.ts`
pattern seen elsewhere in this repo) before assuming a new table is
needed. If static, migrating to a real table is part of this feature,
not optional — a CMS can't write to a hardcoded `.ts` file safely.

```prisma
model BlogPost {
  id            String    @id @default(cuid())
  title         String
  slug          String    @unique
  coverImageUrl String?
  body          String    @db.Text
  status        String    @default("draft") // draft | published
  publishedAt   DateTime?
  authorId      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

No new tables needed for 4.1–4.3 — those are config files and a
third-party SDK integration.

---

## 6. TESTING & VERIFICATION CHECKLIST

- [ ] CI workflow fails the build on a TypeScript error (test by intentionally introducing one on a branch)
- [ ] Sentry captures a manually-triggered test error in both dev and a preview deploy
- [ ] Security headers present on every response (`curl -I` your domain, confirm headers appear)
- [ ] CSP doesn't block legitimate images/scripts — check browser console for blocked-resource warnings after adding
- [ ] Draft blog posts never appear in the public blog index, sitemap, or via direct slug URL
- [ ] Publishing a blog post immediately reflects in `app/sitemap.ts`'s next generation
- [ ] All tests pass with `npx tsc --noEmit`

---

## 7. IMPLEMENTATION PRIORITY

1. **Security Headers/CSP (4.3)** — cheapest, one config file, matters most once checkout is live
2. **Error Tracking (4.2)** — should be in place before real payment traffic starts
3. **CI/CD (4.1)** — valuable ongoing safety net, not urgent pre-launch
4. **Blog CMS (4.4)** — lowest urgency, static blog content works fine short-term

---

## 8. CHANGE LOG

| Date       | Change |
|---|---|
| 2026-09-03 | Initial specification created — CI/CD pipeline, error tracking (Sentry), security headers/CSP, and Blog CMS admin write access. Third-pass gap audit beyond cart_checkout, buyer_account, sitewide_technical_seo, and additional_platform_gaps specs. Spec-only — no code built yet. |

---

**Document Version:** 1.0
**Last Updated:** 2026-09-03
**Status:** Specification Complete — not yet built (none of Sections 4.1–4.4 exist in the repo)
