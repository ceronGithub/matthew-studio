# task-93 — api-create-admin — POST /api/admin/create-admin

**Fulfills:** super_admin_account_specification.md Section 3.2.2
(Create Admin Account)
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item 5
(super_admin_account_specification.md), Phase 3 — Admin Management,
part 1 of 6
**Dependency:** none — Phase 1/2 (auth, session, SecurityLog) already
[DONE].

## Scope (not yet built — planning only)

- New route `app/api/admin/create-admin/route.ts` (superAdmin-only —
  gate with `getSessionAdmin()` + role check, never `hasAdminPermission`
  since only a super-admin may create admins).
- Validates: `fullName` (min 2 chars), `email` (format + uniqueness via
  Supabase admin API), `permissions` (array, must be a subset of the
  6 known permission strings from `lib/hasAdminPermission.ts`'s header
  comment — manage-products, manage-orders, manage-users,
  view-analytics, view-security-logs, manage-promotions).
- Generates a 16-char alphanumeric+special temp password.
- Creates the Supabase user via `supabaseAdminClient.auth.admin.createUser`
  with `user_metadata: { role: "admin", permissions }`.
- Sends the credentials email via the existing EmailJS helper
  (`services/emailjs.ts` pattern, Rule 35.5) — new template
  `admin_account_created` (per Rule 35.5's one-template-per-type rule).
- Logs `admin_created` to SecurityLog via `logSecurityEvent()` (actor =
  the calling super-admin's email, details = "New admin account
  created for [email]").
- Response shape per Rule 28: `{ success, data: { adminId, email,
  createdAt, createdBy }, message }`.
- Rate limit per Rule 32.1 (treat as a sensitive admin-creation
  endpoint — general API limit, 100/15min, is fine here since it's
  already superAdmin-gated).

## Explicitly out of scope

- The list/detail/edit/actions routes (task-94/95) and both UI pages
  (task-96/97/98) — this task is the create endpoint only.
