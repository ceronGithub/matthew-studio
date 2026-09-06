# Task 31 — Middleware Slug Validation

**Spec Reference:** vault_specification.md Section 7.1
**Task Plan Phase:** PHASE 4 — SECURITY & ACCESS HARDENING (item 6, vault_specification.md)
**Dependency:** task-28 (slug generators) [DONE], task-29 (login/logout wiring) [DONE], task-30 (vault API routes) [DONE — see reconciliation note below]
**Status:** DONE — 2026-09-07

---

## Reconciliation note (Rule 49.1 / Rule 16.1)

`overviewProject.txt` Section 5C listed task-30 as "not started," but
`docs/tasks/task-30-vault-api-routes.md` documents it as built, and a
Layer-3 check confirms all three route files exist on disk:
`app/api/vault/slug/validate/route.ts`,
`app/api/vault/credentials/generate/route.ts`,
`app/api/vault/credentials/store/route.ts`. Section 5C was stale — it
has been corrected in place as part of this task's update, per Rule
16.1's cross-check requirement before starting new work.

`docs/taskPlan.md` already listed task-31 as a line item (no
numbering gap); this file did not exist yet, so it is a new
micro-task file, not a reconciled/back-filled one.

---

## Scope

Add Vault slug validation to `middleware.ts`, positioned ahead of the
existing generic role-based routing block, per Section 7.1 and Rule
47.2 (`/<role>/vault/[slug]` route pattern). Explicitly excludes: the
vault page UI itself (task-32) and Gatekeeper/Emergency Actions
backend (task-33).

## Built

- `middleware.ts`
  - Added `VAULT_ROUTE_PATTERN` — matches
    `/superAdmin/vault/<slug>` and `/admin/vault/<slug>`, capturing
    the route's role segment and the AdminSession id carried as the
    slug segment.
  - Added a vault-match branch, evaluated **before** the existing
    `/buyer`, `/superAdmin`, `/admin` generic checks, that:
    1. Calls `validateSlugActive(vaultSessionId)` (task-28's helper)
       to confirm the AdminSession row is active and unexpired.
    2. Confirms **ownership** — `session.userId === data.user?.id` —
       so one admin can never open another admin's vault page by
       swapping the session id in the URL, even if they happened to
       guess a still-active id. This goes beyond the spec's literal
       Section 7.1 snippet (which only checks the auth cookie) per
       Rule 6's ownership-vs-authentication distinction.
    3. Confirms **role match** — `session.role === vaultRouteRole`,
       with the same super-admin-can-reach-admin-tooling exception
       already used by the file's other role checks (Section 12.3).
    4. Redirects to `/auth/login` (reusing the existing
       `redirectToLogin` helper) on any failed check; otherwise
       forwards the request with the same `x-pathname` header
       pattern used by the file's default branch.
  - Updated the file header comment to document this new check.

## Deviations from the spec's literal text (noted, not silent)

- Section 7.1's own code sample only checks that a session cookie is
  present and defers the actual slug/DB validation to "the
  page/route handler." This project already breaks that pattern for
  Gatekeeper (Section 7's existing header note: "Gatekeeper runs
  FIRST... ahead of any Supabase session lookup"), which does a
  Prisma-backed lookup directly in middleware. Task-31's taskPlan.md
  entry explicitly asks for **middleware** slug validation "ahead of
  role-based routing," so this task follows that instruction over
  the spec's more conservative inline comment — consistent with how
  Gatekeeper was already implemented.
- Added the ownership check (`session.userId === data.user?.id`),
  which is not spelled out in Section 7.1's snippet at all. Without
  it, slug validation alone would only prove *a* valid, unexpired
  session exists — not that it belongs to the requester. Left out,
  this would have been a real IDOR-style gap.

## Verification

- `npx eslint middleware.ts` — passes with zero warnings/errors.
- `npx tsc --noEmit` — could not be fully verified in this sandbox:
  `npx prisma generate` fails here because `binaries.prisma.sh` is
  outside the sandbox's allowed network domains, so `@prisma/client`
  has no generated types and the whole repo (not just this file)
  reports `AdminSession`/`PrismaClient` as missing exports. This is
  an environment limitation, not a defect introduced by this task —
  `middleware.ts` does not appear among the reported errors, and the
  `AdminSession.userId`/`.role` field names used here were confirmed
  directly against `prisma/schema.prisma`. Run
  `npx prisma generate && npx tsc --noEmit` locally to confirm zero
  errors end to end before merging.

## Files Changed

- `middleware.ts` (modified)
- `docs/tasks/task-31-middleware-slug-validation.md` (added)
- `docs/taskPlan.md` (modified — task-31 checked off)
- `overviewProject.txt` (modified — Section 5C corrected + updated, CHANGE LOG appended)
