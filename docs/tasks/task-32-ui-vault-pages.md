# Task 32 — Vault Page UI

**Spec Reference:** vault_specification.md Sections 6.1/6.2
**Task Plan Phase:** PHASE 4 — SECURITY & ACCESS HARDENING (item 6, vault_specification.md)
**Dependency:** task-28 (slug generators) [DONE], task-29 (login/logout wiring) [DONE], task-30 (vault API routes) [DONE], task-31 (middleware slug validation) [DONE]
**Status:** DONE — 2026-09-07

---

## Reconciliation note (Rule 49.1 / Rule 16.1)

`docs/taskPlan.md` still listed task-30 as `[ ]` at the start of this
task, despite task-31's own doc already documenting a Layer-3 check
confirming all three vault API route files exist on disk and are
wired. Re-verified directly against the repo (files present, non-
trivial line counts, imported by `lib/vaultHelpers.ts`) and corrected
the checkbox in place before starting task-32's own work, per Rule
16.1's cross-check requirement.

## Scope

Build the Vault page UI at `/superAdmin/vault/[slug]` and
`/admin/vault/[slug]` per Sections 6.1/6.2: Section 1 (current session
slug, read-only, with copy buttons) and Section 2 (generate emergency
credentials, display once, confirm-to-store). Explicitly excludes
Section 3 (Emergency Actions / Gatekeeper panel) and the "Regenerate
Slug" button's actual behavior (both task-33's scope) — shown as
stubs/disabled controls, not omitted silently, per Rule 17.6.

## Built

- `app/superAdmin/vault/page.tsx` / `app/admin/vault/page.tsx`
  - Bare entry routes matching the spec's literal Section 6.1/6.2
    paths. Each resolves the signed-in user via the `sb-access-token`
    cookie + `supabaseAdminClient.auth.getUser`, calls
    `getOrCreateAdminSession` (task-28/29) to get (or reuse) the
    caller's active `AdminSession`, then `redirect()`s to the
    session-scoped URL Rule 47.2 actually requires
    (`/<role>/vault/<AdminSession id>`). Client code never needs to
    know or store the session id ahead of time.
- `app/superAdmin/vault/[slug]/page.tsx` / `app/admin/vault/[slug]/page.tsx`
  - Server Components. Fetch the session directly via
    `validateSlugActive` (Rule 31.1/31.2 — no client-side fetch for
    data already available server-side) and independently re-check
    role (`session.role`) before rendering — defense in depth on top
    of `middleware.ts`'s task-31 guard, not a replacement for it.
  - `notFound()` on an invalid/expired session, covering the race
    where a session expires between middleware's check and render
    (e.g. sign-out from another tab).
  - Admin's page accepts a `superAdmin` session too (Section 12.3
    cross-role access) but passes the session's **actual** role
    (`sessionRole`) to the client component separately from the page
    **display** variant (`pageVariant: "admin"`) — a super-admin
    viewing `/admin/vault` must still send `role: "superAdmin"` to
    `/api/vault/credentials/generate`, or task-30's own role-match
    check (`session.role !== role`) would reject it with a 403. This
    distinction isn't spelled out in the spec's Section 6.2 text; it
    falls directly out of task-30's existing route contract.
- `components/vault/VaultPage.tsx` (new, shared client component)
  - Section 1: renders `slugComponents` (role-shaped: 12+12+12 for
    super-admin, 7+7+7 for admin) as read-only cards with per-
    component copy-to-clipboard buttons (flash "Copied" on the
    button itself, not a page-wide toast — Rule 22 toasts reserved
    for the credentials-confirmation flow below).
  - Section 2: "Generate Emergency Credentials" calls
    `POST /api/vault/credentials/generate`, displays the returned
    plaintext once, then "I've backed these up" hashes it client-side
    (new `lib/clientHash.ts`, Web Crypto `subtle.digest`) and calls
    `POST /api/vault/credentials/store` with only the hashes —
    plaintext is cleared from component state immediately after.
  - Section 3: stub panel (icon + headline + hint text, per Rule
    17.6) noting Gatekeeper/Emergency Actions lands in task-33.
    "Regenerate slug" button present but disabled per spec's own
    Section 6.1 text ("only regenerates on next login").
- `lib/clientHash.ts` (new)
  - Browser-only SHA-256 helper mirroring `lib/vaultHelpers.ts`'s
    `hashVaultCredentials` (words joined with a single space) but
    using `crypto.subtle` instead of Node's `crypto` module, since it
    runs inside a `"use client"` component.
- `app/styles/vault.css` (new) — existing design-token system only
  (no hardcoded colors/spacing), matching the conventions in
  `app/styles/superAdminDashboard.css`.
- `app/superAdmin/dashboard/page.tsx` — added "Security Vault" to
  `QUICK_ACTIONS`.
- `app/admin/dashboard/page.tsx` — added "Security vault" to the
  live-links list (alongside Support ticket handling / Product
  management).

## Deviations from the spec's literal text (noted, not silent)

- Section 6.1/6.2's routes (`/superAdmin/vault`, `/admin/vault`) are
  literal, no-slug paths. Rule 47.2 and task-31's actual middleware
  implementation both require `/<role>/vault/[slug]` (the AdminSession
  id in the URL) for ownership/role validation. Resolved by keeping
  the spec's literal routes as bare redirect entry points and putting
  the real page at the slug-scoped path — satisfies both without
  contradicting either.
- Added the `pageVariant` vs. `sessionRole` split on `VaultPage`
  (not in the spec at all) to prevent a real bug: without it, a
  super-admin using the simplified `/admin/vault` page would have
  their credentials-generate request rejected by task-30's existing
  role-match check.

## Verification

- `npm install` succeeded in this sandbox (569 packages).
- `npx eslint` on all 9 new/modified files — zero warnings/errors.
- `npx tsc --noEmit` — zero errors introduced by this task. The only
  vault-related line in the output is the same pre-existing
  `@prisma/client` has no exported member 'AdminSession'` error
  documented in task-31's doc (`npx prisma generate` is blocked by
  this sandbox's network restriction on `binaries.prisma.sh`) — it
  points at `lib/vaultHelpers.ts`, a file this task did not modify.
  Run `npx prisma generate && npx tsc --noEmit` locally to confirm
  zero errors end to end before merging.

## Files Changed

- `app/superAdmin/vault/page.tsx` (added)
- `app/admin/vault/page.tsx` (added)
- `app/superAdmin/vault/[slug]/page.tsx` (added)
- `app/admin/vault/[slug]/page.tsx` (added)
- `components/vault/VaultPage.tsx` (added)
- `lib/clientHash.ts` (added)
- `app/styles/vault.css` (added)
- `app/superAdmin/dashboard/page.tsx` (modified — added Vault quick action)
- `app/admin/dashboard/page.tsx` (modified — added Vault live link)
- `docs/tasks/task-32-ui-vault-pages.md` (added)
- `docs/taskPlan.md` (modified — task-30 corrected to [DONE], task-32 checked off)
- `overviewProject.txt` (modified — Section 5C updated in place)
- `overviewProject-2.txt` (modified — CHANGE LOG appended, per Rule 45.3 rollover)
