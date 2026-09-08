# task-42 — UI: Admin Security Logs page (self-scoped)

**Fulfills:** admin_account_specification.md, Section 3.6 —
"Security Logs (/admin/security-logs)": a permitted admin can monitor
their own login/security events, scoped server-side to
`WHERE actor = currentAdmin.email`, never exposing platform-wide or
other-admin data.

**taskPlan.md phase:** PHASE 3 (remainder) — ADMIN & SUPER-ADMIN
OVERSIGHT, item 4 (admin_account_specification.md).

**Dependency:** task-45 (UI half) [DONE] — the super-admin Security
Logs page shipped first, giving this task an actual `SecurityLogRow`
component to reuse instead of building one from scratch. task-45 (API
half) also already built the shared `lib/securityLogsQuery.ts` this
task's API route (built alongside task-45) delegates to.

---

## What changed

- `lib/hooks/useAdminSecurityLogs.ts` — new client fetch hook against
  `GET /api/admin/security-logs`. Owns loading/empty/error/forbidden
  states (Rule 25) and the Event Type + Date Range filters only —
  narrower than the super-admin hook (no device/country filter, no
  CSV export), matching Section 3.6's filter list exactly. Re-exports
  `SecurityLogListItem` from `useSecurityLogs.ts` rather than
  redefining the type, since the API returns an identical row shape.
- `components/security-logs/AdminSecurityLogsList.tsx` — new list
  component. Reuses `SecurityLogRow` as-is (Rule 2 — no rewrite);
  restricts the Event Type filter to the four admin-visible event
  types the API route itself accepts (`login_success`, `login_failed`,
  `rate_limit_hit`, `device_change`). Renders a permission-denied
  state when the API returns 403, mirrored from
  `components/admin/AdminAnalytics.tsx`'s `isForbidden` pattern.
- `app/admin/security-logs/page.tsx` — new Server Component page,
  same split as `app/admin/analytics/page.tsx`: no fetching of its
  own, just renders the client list component. Reuses
  `app/styles/securityLogs.css` — no new CSS needed, all classes
  (including the four admin-visible event badges) already existed.
- `app/admin/dashboard/page.tsx` — added a "Security Logs" entry to
  `QUICK_ACTIONS`, `live: true`, linking to `/admin/security-logs`.

## Verification

1. Log in as an admin with the `"view-security-logs"` permission →
   `/admin/dashboard` → click the new Security Logs quick action.
2. Confirm only your own events appear (never another admin's or the
   super-admin's rows).
3. Event Type and date-range filters narrow the list correctly.
4. Log in as an admin without the permission → visiting
   `/admin/security-logs` directly shows the permission-denied
   message, not a crash.
