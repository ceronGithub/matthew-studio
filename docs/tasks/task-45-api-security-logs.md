# task-45 (API half) — Security Logs: shared query + super-admin/admin API routes

**Fulfills:** super_admin_account_specification.md Section 3.3, and
admin_account_specification.md Section 3.6 (the admin route's API
half — task-42 covers that page's UI half separately).

**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5
(super_admin_account_specification.md).

**Dependency:** None blocking — SecurityLog model and
`lib/securityLog.ts`'s `logSecurityEvent()` (Rule 38) already existed
and already write rows; this task only adds the read side. Blocks
task-45 (UI half) and task-42 (both UI and its own completion), which
depend on this.

---

## What was built

- `lib/securityLogsQuery.ts` — `listSecurityLogs()`: paginated,
  filterable (`eventType`, `actorEmail`, date range) query against
  `SecurityLog`, shared by both routes below. Same shape as
  `lib/gatekeeper.ts`'s `listDeviceBans()`.
- `app/api/superadmin/security-logs/route.ts` — `GET`, role must be
  `"superAdmin"` strictly (same pattern as
  `app/api/superadmin/gatekeeper/bans/route.ts`). No `actorEmail`
  passed — platform-wide, unscoped.
- `app/api/admin/security-logs/route.ts` — `GET`, `admin` or
  `superAdmin` via `getSessionAdmin()`, gated on the
  `"view-security-logs"` permission (`hasAdminPermission()`). Always
  passes `actorEmail: admin.email` — self-scoped server-side per
  Section 3.6's explicit "never rely on frontend filtering alone."
  Event-type filter options additionally restricted to the
  admin-relevant subset named in Section 3.6.

## Verification

- `npx tsc --noEmit`: zero errors attributable to these 3 new files.
  (Unrelated pre-existing errors in the repo are from `npx prisma
  generate` failing — this sandbox's network allowlist blocks
  `binaries.prisma.sh`. Regenerate the Prisma client locally and
  re-run `tsc` before merging.)
- No schema change — no `prisma db push` needed for this task.
