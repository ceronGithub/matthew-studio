# task-90 — Beacon + write path (anonymized traffic analytics)

**Fulfills:** sitewide_technical_seo_specification.md — traffic
analytics sub-item (Rule 41 governs the shape).

**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING,
item 11. Second of 3 micro-tasks task-53 was split into (task-89 →
task-90, this file → task-91).

**Dependency:** task-89 [DONE] — `PageViewDaily` model must exist and
`npx prisma db push && npx prisma generate` must have been run.

---

## What changed

- `services/analytics.ts` — `recordPageView()`. Resolves country code
  only via the existing `services/geoip.ts` lookup (city/lat/long/
  accuracy from that lookup are discarded, never written); upserts the
  day's `(date, path, referrerHost, deviceType, countryCode)` bucket.
  Never-break-the-request, try/catch-wrapped — same contract as
  `lib/securityLog.ts`.
- `app/api/analytics/pageview/route.ts` — public POST endpoint. Reads
  IP + User-Agent from headers server-side (never trusts the client
  for deviceType); sanitizes `path`/`referrerHost` with the Rule 18.1
  forbidden-character filter; always responds 204, even on a malformed
  body — a dropped beacon must never be visible to the visitor.
- `components/shared/AnalyticsBeacon.tsx` — client component, renders
  nothing, fires `navigator.sendBeacon` (fetch fallback) on every
  pathname change. Sends only `path` + `referrerHost` (hostname only,
  never the full referrer URL).
- Mounted in `app/(public)/layout.tsx` only — explicitly NOT in
  `app/superAdmin/layout.tsx`, `app/admin/layout.tsx`, or
  `app/buyer/layout.tsx`. Those areas' navigation is
  AccountActivityLog's job (Rule 42), a separate table/purpose.

## Next micro-task (task-91)

Super-admin Analytics dashboard page, reading `PageViewDaily` only.
No further schema or write-path changes expected.
