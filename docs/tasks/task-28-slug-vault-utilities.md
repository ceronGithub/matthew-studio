# Task 28 — Slug + Vault-Credentials Utility Functions

**Spec:** `vault_specification.md`, Sections 2.2, 2.3, 3.1 (+ 8.1 for the
randomness requirement)
**Status:** DONE — 2026-09-07

## Scope

Pure-function generators for the Vault session-slug and emergency
vault-credentials components, plus the two DB-touching helpers Section
9's checklist lists under "Utility Functions" (not API routes).
Explicitly excludes: API routes (task-29/30), middleware (task-31),
UI (task-32), and Gatekeeper backend (task-33).

## Built

- `lib/slugGenerator.ts`
  - `generateWords(count)` — distinct random BIP39 words, CSPRNG sampling
  - `generateAlphanumeric(count)` — {A-Z,a-z,0-9}, evenly split across the 3 charsets, shuffled
  - `generateAlphaspecial(count)` — 50% alphanumeric / 50% special, shuffled
- `lib/vaultHelpers.ts`
  - `generateSuperAdminSlug()` — 12 words + 12 alphanumeric + 12 alphaspecial
  - `generateAdminSlug()` — 7 alphanumeric + 7 alphaspecial + 7 words
  - `generateSlugForRole(role)` — dispatches by role, returns slug + expiresAt (24h)
  - `validateSlugActive(sessionId)` — fail-closed active+expiry check
  - `expireAdminSessions(userId)` — bulk-deactivate on sign-out
  - `generateVaultCredentials()` — 15 words + 15 alphanumeric, ephemeral (never persisted)
  - `hashVaultCredentials(words, alphanumeric)` — SHA-256 for VaultCredentials' audit-trail-only storage

## Deviations from the spec's literal text (noted, not silent)

1. **Randomness API name:** spec says `crypto.getRandomValues()` (browser
   Web Crypto). This code runs server-side, so it uses Node's
   `crypto.randomInt()` — same CSPRNG guarantee, different API surface
   because there's no browser context here.
2. **Word list size:** spec says "BIP39 word list (1,624 standard
   words)". The real, standard BIP39 English wordlist is 2,048 words
   (confirmed via the `bip39` npm package). Used the real 2,048-word
   list rather than inventing a shorter one — treating the spec's
   count as a documentation error, not a requirement to truncate a
   well-known standard list.
3. **Admin alphaspecial example count mismatch:** spec's prose says "7
   Alphaspecialcharacter" but its own example string
   (`a!B@c#D$`) is 8 characters. Followed the stated count (7), not
   the miscounted example.

## New dependency

- `bip39` (^3.1.0) — added to `package.json`. Provides the standard
  2,048-word English BIP39 list (`wordlists.english`). No other exports
  from this package are used (mnemonic/seed functions are irrelevant
  here — only the wordlist).

## Verification

- `npx tsc --noEmit` — 0 new errors beyond the expected ungenerated-
  Prisma-Client category (`AdminSession` unresolved from
  `@prisma/client`, because `npx prisma generate` cannot reach
  `binaries.prisma.sh` in this sandbox — pre-existing environment
  limitation documented on earlier tasks, not a code defect).
- `npx eslint lib/slugGenerator.ts lib/vaultHelpers.ts` — clean.
- Manually traced the distribution math: `generateAlphanumeric(12)` →
  4/4/4 exact thirds (matches spec's super-admin example); `(7)` →
  3/2/2 ("even spread", matches spec's admin wording);
  `generateAlphaspecial(12)` → 6/6 (matches the spec's 12-char
  alternating example exactly); `(7)` → 4/3.

## Next

task-29 — modify `/api/auth/login` and `/api/auth/logout` to call
`generateSlugForRole()` / `expireAdminSessions()` and persist the
`AdminSession` row.
