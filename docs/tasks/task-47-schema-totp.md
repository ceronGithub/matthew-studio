# task-47 — schema-totp — AdminTotpCredential model

**Fulfills:** super_admin_account_specification.md Section 9.1
("2FA/MFA on super-admin login") + Section 12 Phase 1 ("Section 9.1:
2FA/TOTP enrollment + verification — built here since it changes the
login flow itself, not bolted on later")
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item
"task-47 — Phase 1: 2FA/TOTP enrollment", part 1 of 6
**Dependency:** none — this is the first sub-task; task-47-api-totp-enroll
and task-47-api-totp-login-verify both depend on this being [DONE] first.

## Why this needs its own file (Rule 49 Step 4)

The full task-47 line item touches 4+ layers (schema, 2 API surfaces,
2 UI surfaces, and a middleware-level enrollment gate) and spans code
in `prisma/schema.prisma`, `app/api/`, `app/auth/`, `app/admin/` (or
`app/superAdmin/`), and `middleware.ts` — well past the "2+
directories/layers together" split threshold. Broken into 6 micro-tasks,
this one covers ONLY the data model.

## Scope (not yet built — planning only, per Rule 49 Step 3)

- New Prisma model `AdminTotpCredential`, following the existing
  `AdminSession`/`VaultCredentials` pattern (`userId` as a plain string
  referencing Supabase `auth.users.id` — no local User table, per
  schema.prisma's header comment at line ~389):
  - `id`, `userId` (indexed), `role` ("admin" | "superAdmin")
  - `secretEncrypted` (String) — TOTP secret, encrypted at rest (never
    stored in plaintext; reuse or extend an existing crypto helper if
    one exists in `lib/`, e.g. alongside `lib/clientHash.ts`'s pattern —
    confirm at build time rather than assuming one exists)
  - `enabled` (Boolean, default false) — flips true only after the
    enrollment verification step (task-47-api-totp-enroll) succeeds
  - `enrolledAt` (DateTime?), `lastVerifiedAt` (DateTime?)
  - `createdAt`, `updatedAt`
  - Indexes: `@@index([userId])`, `@@index([enabled])`
- New dependencies to install: an RFC 6238 TOTP library (e.g. `otplib`)
  and a QR-code generator (e.g. `qrcode`) — package.json currently has
  neither (verified via grep, 2026-09-08).
- Migration commands per Rule 21/37.2 (Supabase-safe): `npx prisma db
  push` then `npx prisma generate` — never `migrate dev`/`migrate deploy`.

## What was built (2026-09-08)

- `prisma/schema.prisma` — added `AdminTotpCredential` model, placed
  between `AdminSession` and `VaultCredentials`: `userId` (indexed),
  `role`, `secretEncrypted` (String — AES-256-GCM ciphertext, never
  plaintext), `enabled` (default false), `enrolledAt`,
  `lastVerifiedAt`, timestamps, `@@index([userId])`,
  `@@index([enabled])`.
- `lib/totpCrypto.ts` (new) — `encryptTotpSecret()` /
  `decryptTotpSecret()`, AES-256-GCM keyed by `TOTP_ENCRYPTION_KEY`
  (32-byte, base64, server-only per Rule 18.5). Reversible by design —
  unlike `lib/vaultHelpers.ts`'s one-way SHA-256 hashing, a TOTP check
  at login must recover the raw secret to re-derive the current code.
  IV + auth tag + ciphertext are packed into one base64 string so the
  column stays a single `String` field.
- `package.json` — added `otplib` (RFC 6238 code generation/verification)
  and `qrcode` + `@types/qrcode` (enrollment QR code) — none of these
  existed before (grep-verified 2026-09-08). Not yet installed in this
  sandbox; run `npm install` locally before the next micro-task.
- `overviewProject.txt` Section 7 — added `TOTP_ENCRYPTION_KEY` to the
  required env var list, with the generation command inline.

## Explicitly out of scope for this sub-task

- No API routes (task-47-api-totp-enroll, task-47-api-totp-login-verify)
- No UI (task-47-ui-totp-enrollment, task-47-ui-totp-login-step)
- No middleware gate (task-47-totp-setup-gate)
- No backup/recovery codes — Section 9.1's "break-glass recovery" is
  listed as a separate, currently-undocumented procedure, not part of
  this build item; never invent backup-code scope that the spec didn't
  ask for.
