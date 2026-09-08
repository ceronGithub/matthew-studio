# task-45 (UI half) — Super-Admin Security Logs viewer page

**Fulfills:** super_admin_account_specification.md Section 3.3, and
Rule 38.9 (mandatory super-admin Security Logs page).

**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5
(super_admin_account_specification.md).

**Dependency:** task-45 (API half) — `lib/securityLogsQuery.ts` +
`GET /api/superadmin/security-logs` — already done (2026-09-08). This
task builds directly on top of it and extends the query lib with two
filters (`deviceType`, `geoCountry`) that the API half hadn't covered,
needed to satisfy Section 3.3's full filter list. Unblocks task-42
(Admin Security Logs page), which reuses this task's component
pattern.

---

## What was built

- `lib/securityLogsQuery.ts` — extended `listSecurityLogsParams` with
  optional `deviceType` and `geoCountry` filters (geoCountry
  normalized to uppercase ISO code before the `where` match).
- `app/api/superadmin/security-logs/route.ts` — parses and forwards
  the two new query params.
- `lib/hooks/useSecurityLogs.ts` — client-side fetch hook (Rule 31.2):
  owns pagination + eventType/deviceType/geoCountry/date-range filter
  state against the route above. Mirrors `useGatekeeperBans.ts`.
- `components/security-logs/SecurityLogRow.tsx` — expandable row:
  collapsed shows event badge, actor, device/location, IP, timestamp
  (Section 3.3's column list); expanded shows device fingerprint,
  geolocation, user-agent, browser/OS (Section 3.3's "Expandable
  rows").
- `components/security-logs/SecurityLogsList.tsx` — toolbar (4
  filters), three data states (Rule 25: skeleton/empty/error+retry),
  pagination, and a client-side CSV export of the currently loaded,
  already-filtered page (no new export endpoint needed).
- `app/superAdmin/security-logs/page.tsx` — Server Component wrapper
  (Rule 31.1), same split as `app/superAdmin/gatekeeper/page.tsx`. The
  dashboard's "Security Logs" quick action already linked here
  (`app/superAdmin/dashboard/page.tsx`) — no dashboard edit needed.
- `app/styles/securityLogs.css` — new stylesheet; event badge colors
  follow Section 3.3's exact mapping (green/red/amber/blue/dark-red/
  orange).

## Verification

- `npx tsc --noEmit`: 45 pre-existing errors, all attributable to
  `npx prisma generate` failing in this sandbox (network allowlist
  blocks `binaries.prisma.sh` — same blocker task-45's API half
  noted). Zero errors in any file touched by this task. Regenerate
  the Prisma client locally and re-run `tsc` before merging.
- No schema change — no `prisma db push` needed for this task.
