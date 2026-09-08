# task-47 — api-totp-enroll — TOTP enrollment API (generate + verify)

**Fulfills:** super_admin_account_specification.md Section 9.1
("2FA/MFA on super-admin login") + Section 12 Phase 1
**taskPlan.md phase:** PHASE 4 — SECURITY & ACCESS HARDENING, item
"task-47 — Phase 1: 2FA/TOTP enrollment", part 2 of 6
**Dependency:** task-47-schema-totp — [DONE] (AdminTotpCredential model
+ lib/totpCrypto.ts must exist first; this task only consumes them)

## Scope (not yet built — planning only, as originally filed)

- `POST /api/admin/totp/enroll` — generate + store a pending secret
- `POST /api/admin/totp/enroll/verify` — confirm the code, flip enabled
- Rate-limited, logged to SecurityLog, generic failure messages

## What was built (2026-09-08) — and one routing deviation from the plan

- `app/api/auth/totp/enroll/route.ts` (new) — **not**
  `/api/admin/totp/enroll` as originally scoped above. Reason: every
  existing `/api/admin/*` route is scoped to business/content
  operations for an already-fully-authenticated admin (profile,
  orders, products). TOTP enrollment is a session-lifecycle/security
  setup action — same category as `/api/auth/recovery-setup/*`
  (buyer-side mandatory post-registration setup) and
  `/api/auth/login`/`register`/`logout` — and applies symmetrically to
  both `admin` and `superAdmin`, not admin-specific business data. Put
  it under `/api/auth/totp/enroll` to match that existing convention
  rather than introduce a one-off exception under `/api/admin/*`.
  Login-time verification (task-47-api-totp-login-verify) should
  follow the same `/api/auth/totp/*` namespace for consistency.
- Single file with `GET` (status check) + `POST` actions
  (`"generate"` / `"verify"`) rather than two separate route files —
  mirrors `app/api/auth/recovery-setup/*`'s established
  multi-action-per-endpoint shape in this codebase.
- Auth via `lib/getSessionAdmin.ts`, CSRF via `lib/csrf.ts`, rate
  limited 5/15min via `lib/rateLimit.ts` (endpoint label
  `"totp-enroll"`).
- `handleGenerate`: refuses (409) if a credential is already
  `enabled: true` — no silent secret-rotation from a possibly-stolen
  session. Deletes stale `enabled: false` rows for the same user
  before issuing a new secret + otpauth URI (issuer `"Matthew
  Studio"`) + QR code data URL (via `qrcode`).
- `handleVerify`: validates the code is 6 digits, looks up the most
  recent `enabled: false` row, decrypts via
  `lib/totpCrypto.ts:decryptTotpSecret()`, checks it with otplib's
  `verify()` (30s `epochTolerance` for clock drift), and on success
  sets `enabled: true` + `enrolledAt`/`lastVerifiedAt`.
- SecurityLog events: `totp_enrollment_initiated` / `_completed` /
  `_failed` (generic response messages either way, per Rule 34.1 —
  never reveal whether a pending enrollment exists).
- **otplib v13 API note:** the package was pinned as `^13.5.0` by
  task-47-schema-totp, and turned out to have fully removed the old
  v12 `authenticator` singleton in favor of an async, standalone
  functional API (`generateSecret`, `generateURI`, `verify`). Code
  here targets v13's actual API — flagged inline in the route file so
  task-47-api-totp-login-verify (which also calls `verify()`) doesn't
  rediscover this from scratch.
- Verification: `npx tsc --noEmit` clean on this file (project-wide,
  ~44 pre-existing errors remain from the sandbox's ungenerated
  Prisma client — `binaries.prisma.sh` is blocked here; run `npx
  prisma generate` locally, no `db push` needed since the schema
  didn't change this pass). `npx eslint` clean on this file.

## Explicitly out of scope for this sub-task

- No login-time TOTP gate (task-47-api-totp-login-verify)
- No UI — enrollment screen (task-47-ui-totp-enrollment) or login
  TOTP prompt (task-47-ui-totp-login-step)
- No middleware forced-enrollment redirect (task-47-totp-setup-gate)
- No "disable 2FA" endpoint — not asked for by the spec at this phase
