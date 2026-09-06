# Task 29 — Wire Session Slug Into Login/Logout Routes

**Spec:** `vault_specification.md`, Sections 5.1, 5.2, 2.1, 8.3
**Status:** DONE — 2026-09-07

## Scope

Modify the existing `/api/auth/login` and `/api/auth/logout` routes to
issue, reuse, and expire the Vault session slug for admin/superAdmin
roles only. Buyers are untouched — no AdminSession row applies to them.

## Built

- `lib/vaultHelpers.ts` — added `getOrCreateAdminSession(userId, role,
  context)`: reuses an active, unexpired AdminSession (bumping
  `lastActivityAt` only) or generates + persists a brand-new one via
  task-28's `generateSlugForRole()`. Implements Section 2.1's full
  lifecycle (first login / subsequent login / post-logout new slug).
- `app/api/auth/login/route.ts` — added `buildLoginResponseData()`:
  for admin/superAdmin roles, calls `getOrCreateAdminSession()` and
  logs `vault_slug_generated` or `vault_slug_reused` (Section 8.3),
  returning `adminSessionId` + `slug` alongside the existing
  `{userId, email, role}` shape. Buyers get the unchanged base shape.
  Wrapped in try/catch — a slug failure never blocks a successful
  login (logs and falls back to base data).
- `app/api/auth/logout/route.ts` — resolves the caller via the
  existing `lib/getSessionAdmin.ts` (before cookies are cleared),
  calls `expireAdminSessions(admin.id)` for admin/superAdmin callers,
  and logs `vault_slug_expired`. Runs ahead of the existing
  Origin-Scoped Session Termination logic (Rule 44), which is
  untouched.

## Deviations from the spec's literal text

- Spec's example logout request body is `{ "sessionId": "session-uuid" }`
  (client sends the session id explicitly). This codebase's logout
  route takes no request body at all — it resolves the caller from the
  `sb-access-token` cookie via `getSessionAdmin()`, the same pattern
  every other authenticated route here uses. Expiring *all* of that
  user's active sessions (not just one named session id) is also more
  correct given Section 2.1 only ever expects one active session per
  user at a time.
- Login's success response is the existing `{success, data, message}`
  envelope (Rule 28), not the spec's bare `{success, data, message}`
  example — same shape already used by this route, slug data just
  added into `data`.

## Verification

- `npx tsc --noEmit` — 1 new error surfaced and fixed (`data.user.email`
  is `string | undefined` from Supabase, narrowed to `?? null` at the
  call site). Final diff against the task-28 baseline: only the
  pre-existing ungenerated-Prisma-Client line remains (now on
  `lib/vaultHelpers.ts:18` instead of `:21`, since a new export was
  added above it — same category, not a new error).
- `npx eslint app/api/auth/login/route.ts app/api/auth/logout/route.ts lib/vaultHelpers.ts` — clean.

## Next

task-30 — `/api/vault/slug/validate`, `/api/vault/credentials/generate`,
`/api/vault/credentials/store` routes.
