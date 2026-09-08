# task-46 — Super-Admin Account Activity page

**Fulfills:** super_admin_account_specification.md Section 3.4, and
Rule 42.3 (mandatory super-admin Account Activity page).

**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5
(super_admin_account_specification.md), the line directly after
task-45 (Security Logs, API + UI — [DONE]).

**Dependency:** `AccountActivityLog` (prisma/schema.prisma) and
`recordAccountActivity()` (lib/accountActivity.ts) — already live and
already writing rows from `app/superAdmin/layout.tsx`'s page-view
beacon and `app/api/admin/profile/password/route.ts`'s password-change
action. This task only builds the missing read/display path — no
schema change, no new write path.

---

## What was built

- `lib/accountActivityQuery.ts` — shared paginated, filterable query
  against `AccountActivityLog`, mirroring `lib/securityLogsQuery.ts`'s
  shape. Filters: `accountId` (exact match, for the Section 3.4
  dropdown), `action` (contains-match — `action` isn't a fixed enum
  like `SecurityLog.eventType`, since it stores either a page path or
  a free-form named action, so contains-match is the correct filter
  here rather than an exact match), and a `createdAt` date range.
  Also exports `listDistinctAccountActors()` — the account dropdown's
  option list, read directly from `AccountActivityLog` (there is no
  separate admin-accounts table; admin/super-admin identity lives in
  Supabase Auth, and `accountId` already stores the account's email).
- `app/api/superadmin/account-activity/route.ts` — GET, super-admin
  only (`getSessionAdmin` + `role === "superAdmin"`, same guard as
  `app/api/superadmin/security-logs/route.ts`). Returns the paginated
  rows plus the distinct-accounts list in the same response, avoiding
  a second round trip for the filter dropdown.
- `lib/hooks/useAccountActivity.ts` — client-side fetch hook (Rule
  31.2): owns pagination + accountId/action/date-range filter state.
  Mirrors `useSecurityLogs.ts`'s shape exactly.
- `components/account-activity/AccountActivityRow.tsx` — collapsed
  row shows Account Email, Action, IP, Device, When (Section 3.4's
  column list); expanded reveals full user-agent and city-level
  geolocation (Section 3.4's "Expandable rows" requirement).
- `components/account-activity/AccountActivityList.tsx` — toolbar
  (account dropdown, action text filter, date range), three data
  states (Rule 25: skeleton/empty/error+retry), pagination. No CSV
  export — not listed in Section 3.4's content requirements, unlike
  Section 3.3's Security Logs page.
- `app/superAdmin/account-activity/page.tsx` — Server Component
  wrapper (Rule 31.1), same split as
  `app/superAdmin/security-logs/page.tsx`. The dashboard's "Account
  Activity" quick action already linked here (it was added ahead of
  this page existing) — no dashboard change needed.
- `app/styles/accountActivity.css` — styles, deliberately matching
  `app/styles/securityLogs.css`'s row/toolbar/pagination density so
  every super-admin list page reads as one system (Rule 17).

## Not touched

- `prisma/schema.prisma` — `AccountActivityLog` already covers every
  field Section 3.4 needs. No migration, no `db push`.
- `lib/accountActivity.ts` (`recordAccountActivity()`) — the write
  path is unchanged; this task is read/display only.
