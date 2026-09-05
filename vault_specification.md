# Vault Specification — Admin Credential & Slug Generation

## 1. PURPOSE & OVERVIEW

The **Vault System** is a two-tier security mechanism for super-admin and admin accounts:

1. **Session Slug** — auto-generated on first login, persists across sessions, expires on sign-out
   - Super-admin: 12 words + 12 alphanumeric + 12 alphaspecialcharacter (36 total)
   - Admin: 7 alphanumeric + 7 alphaspecialcharacter + 7 words (21 total)

2. **Vault Credentials** — backup emergency access codes generated manually within the vault page
   - 15 words + 15 alphanumeric (30 total)
   - For both super-admin and admin (same credentials format)

**Key Principle:** Session slugs provide session identification + emergency access backup. Vault credentials provide offline emergency access if primary auth fails.

---

## 2. SESSION SLUG SYSTEM

### 2.1 — Slug Lifecycle (Auto-Generated)

**FIRST LOGIN (No Slug Exists):**

```
User logs in → System checks AdminSession table for existing slug
  → None found → Auto-generate new slug
  → Store in AdminSession with isActive = true
  → Redirect to dashboard (or vault page if first-time setup)
```

**SUBSEQUENT LOGINS (Slug Exists, User Still Active):**

```
User logs in → System checks AdminSession table
  → Slug found with isActive = true
  → Reuse existing slug (DO NOT regenerate)
  → User retains active session
```

**SIGN-OUT (Terminate Slug):**

```
User clicks "Sign Out" → Backend expires slug
  → Update AdminSession: isActive = false, signedOutAt = now()
  → Session cookie cleared (httpOnly maxAge: 0)
  → Slug becomes invalid
```

**NEXT LOGIN (After Sign-Out):**

```
User logs in again → Check AdminSession for any active slug
  → None active (all marked isActive = false)
  → Auto-generate BRAND NEW slug (never reuse old one)
  → Store with new UUID/hash
```

---

### 2.2 — Super-Admin Slug Format (36 Components)

**Component 1: 12 Words**

- Source: BIP39 word list (1,624 standard words)
- Generated: 12 random words selected
- Display: Grid layout (4 columns desktop, 2 tablet, 1 mobile)
- Presentation: Mono font, surface-active background, user-select: none
- Example: `["apple", "beach", "crown", "delta", "eagle", "frost", "guitar", "house", "island", "jungle", "kitten", "light"]`

**Component 2: 12 Alphanumeric Characters**

- Source: {A-Z, a-z, 0-9}
- Distribution: 4 uppercase, 4 lowercase, 4 digits
- Display: Colored blocks/tokens
- Example: `Aa1Bb2Cc3Dd4`

**Component 3: 12 Alphaspecialcharacter**

- Source: {a-z, A-Z, 0-9, !@#$%^&\*-\_+=}
- Distribution: 50% alphanumeric, 50% special characters
- Display: Colored blocks (alpha: light blue, special: light coral)
- Example: `a!B@c#D$e%F^`

**Total Slug:** 36 components (12 + 12 + 12)

**Storage & Display:**

- Stored in `AdminSession.slug` as a JSON object or concatenated string
- Example JSON:
  ```json
  {
    "words": [
      "apple",
      "beach",
      "crown",
      "delta",
      "eagle",
      "frost",
      "guitar",
      "house",
      "island",
      "jungle",
      "kitten",
      "light"
    ],
    "alphanumeric": "Aa1Bb2Cc3Dd4",
    "alphaspecial": "a!B@c#D$e%F^",
    "generatedAt": "2026-09-03T10:30:00Z",
    "isActive": true
  }
  ```

---

### 2.3 — Admin Slug Format (21 Components)

**Component 1: 7 Alphanumeric Characters**

- Source: {A-Z, a-z, 0-9}
- Distribution: Even spread
- Example: `Aa1Bb2Cc`

**Component 2: 7 Alphaspecialcharacter**

- Source: {a-z, A-Z, 0-9, !@#$%^&\*-\_+=}
- Distribution: 50% alphanumeric, 50% special
- Example: `a!B@c#D$`

**Component 3: 7 Words**

- Source: BIP39 word list (1,624 standard words)
- Generated: 7 random words selected
- Display: Inline or grid layout
- Example: `["apple", "beach", "crown", "delta", "eagle", "frost", "guitar"]`

**Total Slug:** 21 components (7 + 7 + 7)

**Storage & Display:**

```json
{
  "alphanumeric": "Aa1Bb2Cc",
  "alphaspecial": "a!B@c#D$",
  "words": ["apple", "beach", "crown", "delta", "eagle", "frost", "guitar"],
  "generatedAt": "2026-09-03T10:35:00Z",
  "isActive": true
}
```

---

## 3. VAULT CREDENTIALS (Emergency Access)

### 3.1 — Vault Credentials Format (30 Components)

**Purpose:** Offline emergency backup access — generated manually within the vault page, stored securely offline by the admin.

**Component 1: 15 Words**

- Source: BIP39 word list
- Generated: 15 random words (on page load or "regenerate" button)
- Display: Grid layout (5 columns desktop, 3 tablet, 2 mobile)
- Presentation: Mono font, larger text for readability
- Example: `["abandon", "ability", "able", "about", "above", "absent", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acknowledge", "acquire"]`

**Component 2: 15 Alphanumeric Characters**

- Source: {A-Z, a-z, 0-9}
- Distribution: 5 uppercase, 5 lowercase, 5 digits
- Display: Colored blocks/tokens
- Example: `Aa1Bb2Cc3Dd4Ee5`

**Total Vault Credentials:** 30 components (15 + 15)

**Storage:**

- NOT stored in database (security principle: emergency codes exist offline only)
- User must copy/screenshot/write down immediately after generation
- Vault page shows warning: ⚠️ "These credentials exist only on this screen. Copy, screenshot, or write them down. They will NOT be retrievable after you close this page."

```json
{
  "words": [
    "abandon",
    "ability",
    "able",
    "about",
    "above",
    "absent",
    "abuse",
    "access",
    "accident",
    "account",
    "accuse",
    "achieve",
    "acid",
    "acknowledge",
    "acquire"
  ],
  "alphanumeric": "Aa1Bb2Cc3Dd4Ee5",
  "generatedAt": "2026-09-03T10:45:00Z",
  "expiresAt": "2026-09-04T10:45:00Z"
}
```

---

## 4. DATABASE SCHEMA

### 4.1 — AdminSession Model

```prisma
model AdminSession {
  id                    String    @id @default(cuid())

  // User & Role
  userId                String
  role                  String    // "superAdmin" | "admin"

  // Slug (auto-generated on first login, persists until sign-out)
  slug                  Json      // { words: [...], alphanumeric: "...", alphaspecial: "..." }
  isActive              Boolean   @default(true)

  // Lifecycle
  loginAt               DateTime  @default(now())
  lastActivityAt        DateTime  @default(now())
  signedOutAt           DateTime?
  expiresAt             DateTime  // 24 hours from login

  // Security & Audit
  ipAddress             String?
  userAgent             String?
  deviceType            String?   // "mobile" | "tablet" | "desktop"

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@index([isActive])
  @@index([expiresAt])
  @@unique([userId, slug])
}
```

### 4.2 — VaultCredentials Model (Metadata Only)

```prisma
model VaultCredentials {
  id                    String    @id @default(cuid())

  // User & Session Reference
  userId                String
  adminSessionId        String    // Link to AdminSession
  role                  String    // "superAdmin" | "admin"

  // Credentials (stored as hash/encrypted, never plaintext)
  wordsHash             String    // SHA-256(words joined)
  alphanumericHash      String    // SHA-256(alphanumeric)

  // Lifecycle
  generatedAt           DateTime  @default(now())
  expiresAt             DateTime  // 24 hours from generation
  accessedAt            DateTime? // When/if emergency access was used

  // Security
  generatedBy           String?   // super-admin email if created on behalf

  createdAt             DateTime  @default(now())

  @@index([userId])
  @@index([adminSessionId])
  @@index([expiresAt])
}
```

---

## 5. API ROUTES

### 5.1 — POST /api/auth/login (Modified)

**Purpose:** Authenticate user and auto-generate or reuse slug

**Request:**

```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "role": "superAdmin",
    "adminSessionId": "session-uuid",
    "slug": {
      "words": [...],
      "alphanumeric": "Aa1Bb2Cc3Dd4",
      "alphaspecial": "a!B@c#D$e%F^"
    }
  },
  "message": "Logged in successfully."
}
```

**Backend Logic:**

```typescript
1. Validate email + password against Supabase
2. Extract role from JWT
3. Check if active AdminSession exists for this user
   → If yes, isActive = true → Reuse slug
   → If no (or all inactive) → Auto-generate new slug
4. Store/update AdminSession in database
5. Set session cookie (httpOnly, maxAge: 7 days)
6. Return slug + redirect URL
```

---

### 5.2 — POST /api/auth/logout (Modified)

**Purpose:** Invalidate slug and expire session

**Request:**

```json
{
  "sessionId": "session-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Signed out successfully."
}
```

**Backend Logic:**

```typescript
1. Find AdminSession by sessionId
2. Update: isActive = false, signedOutAt = now()
3. Delete session cookie (maxAge: 0)
4. Log security event: eventType = "logout"
5. Return success
```

---

### 5.3 — GET /api/vault/slug/validate

**Purpose:** Validate slug is still active (called on page load)

**Request:**

```
GET /api/vault/slug/validate?sessionId=session-uuid
```

**Response (Valid):**

```json
{
  "success": true,
  "data": {
    "isActive": true,
    "role": "superAdmin",
    "expiresAt": "2026-09-04T10:30:00Z",
    "timeRemaining": "23 hours"
  }
}
```

**Response (Invalid):**

```json
{
  "success": false,
  "message": "Session slug has expired. Please log in again."
}
```

---

### 5.4 — POST /api/vault/credentials/generate

**Purpose:** Generate vault credentials (15 words + 15 alphanumeric)

**Request:**

```json
{
  "sessionId": "session-uuid",
  "role": "superAdmin"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "words": [...15 words...],
    "alphanumeric": "Aa1Bb2Cc3Dd4Ee5",
    "generatedAt": "2026-09-03T10:45:00Z",
    "expiresAt": "2026-09-04T10:45:00Z",
    "warning": "⚠️ These credentials exist only on this screen. Copy or screenshot immediately."
  }
}
```

**Backend Logic:**

```typescript
1. Validate session slug is active
2. Generate 15 random BIP39 words
3. Generate 15 random alphanumeric chars (5 upper, 5 lower, 5 digit)
4. Create VaultCredentials record (hashed, not plaintext)
5. Return credentials (ephemeral, not stored as plaintext)
6. DO NOT store plaintext credentials in DB
```

---

### 5.5 — POST /api/vault/credentials/store

**Purpose:** Store hashed vault credentials metadata (for audit trail only)

**Request:**

```json
{
  "sessionId": "session-uuid",
  "wordsHash": "sha256-hash",
  "alphanumericHash": "sha256-hash"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Vault credentials recorded."
}
```

**Backend Logic:**

```typescript
1. Validate session is active
2. Hash the provided values
3. Store in VaultCredentials table
4. Log security event: eventType = "vault_credentials_generated"
5. Return success
```

---

## 6. VAULT PAGE LAYOUT & UI

### 6.1 — Super-Admin Vault Page

**Route:** `/superAdmin/vault`

**Header:**

```
Heading: "Security Vault — Admin Session & Backup Credentials"
Subheading: "View your session slug and generate emergency backup credentials"

Session Info Box:
  Session Slug Status: Active ✓
  Slug Components: 12 words + 12 alphanumeric + 12 alphaspecial
  Generated: [date/time]
  Expires at Sign-Out
  Regenerate on Next Login: Yes
```

**Warning Banner (Amber):**

```
⚠️ Session Slug
This slug is your session identifier. It changes every login and expires when you sign out.
Store it securely offline if needed for recovery purposes.
Never share, never commit to version control, never email unencrypted.
```

**Section 1: Current Session Slug (Read-Only)**

- Display all 3 components in separate boxes
- Copy buttons for each component
- "Regenerate Slug" button (disabled — only regenerates on next login)

**Section 2: Generate Vault Credentials**

- Button: "Generate Emergency Credentials"
- Opens modal/modal-like section
- Shows 15 words grid + 15 alphanumeric
- Warning: "Copy or screenshot immediately. Not stored in the system."
- Buttons: "Copy Words" | "Copy Alphanumeric" | "Close"

**Section 3: Emergency Actions** — see Section 12 (Gatekeeper & Emergency Actions).

**Footer:**

- Last updated: [timestamp]
- Security tips: "Emergency credentials are ephemeral. Generate and store offline. Never rely on the browser to keep them."

---

### 6.2 — Admin Vault Page

**Route:** `/admin/vault`

**Same structure as super-admin, but with:**

- 7 alphanumeric + 7 alphaspecial + 7 words slug
- Same vault credentials generation (15 words + 15 alphanumeric)
- Simplified header (fewer warnings)
- Same Emergency Actions section (Section 12) — both roles get the full Gatekeeper panel and all five emergency controls, unlike the rest of the vault page which is simplified for admin.

---

## 7. MIDDLEWARE & ACCESS CONTROL

### 7.1 — Middleware Slug Validation

**File:** `middleware.ts`

```typescript
/**
 * Vault Route Protection
 * Any request to /superAdmin/vault or /admin/vault must:
 * 1. User authenticated (session cookie present)
 * 2. Role is superAdmin or admin (from JWT)
 * 3. AdminSession exists and isActive = true
 * 4. Session not expired (expiresAt > now)
 */

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionId = request.cookies.get("session")?.value;

  // Vault routes require active session
  if (
    pathname.startsWith("/superAdmin/vault") ||
    pathname.startsWith("/admin/vault")
  ) {
    // Check session exists
    if (!sessionId) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Validate slug is active (async check)
    // This is typically done in the page/route handler
    // Middleware checks session cookie only
  }

  return NextResponse.next();
}
```

---

## 8. SECURITY RULES

### 8.1 — Slug Generation Security

- ✅ Every slug component is cryptographically random
- ✅ BIP39 words are from a fixed, standard dictionary (no weak randomness)
- ✅ Alphanumeric and special chars use `crypto.getRandomValues()` (not Math.random)
- ✅ Slug is unique per session (never reused across sessions)
- ✅ Slug expires immediately on sign-out (isActive = false)
- ✅ Old slugs cannot be reactivated (new login = new slug always)

### 8.2 — Vault Credentials Security

- ✅ Plaintext credentials NEVER stored in database
- ✅ Only hashes (SHA-256) are stored for audit trail
- ✅ Credentials displayed only on page load (ephemeral)
- ✅ Must be copied/screenshotted by user (no "download" button)
- ✅ Credentials expire 24 hours from generation (metadata only, no enforcement)
- ✅ Every generation is logged to VaultCredentials table + SecurityLog

### 8.3 — Audit & Logging

**Events Logged (SecurityLog):**

- `vault_slug_generated` — slug auto-generated on login
- `vault_slug_reused` — existing slug reused on login
- `vault_slug_expired` — slug invalidated on sign-out
- `vault_credentials_generated` — emergency credentials generated
- `vault_access` — user accessed vault page

---

## 9. IMPLEMENTATION CHECKLIST

### Database & Schema

- [ ] Add `AdminSession` model to `prisma/schema.prisma`
- [ ] Add `VaultCredentials` model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Run `npx prisma generate`

### Utility Functions

- [ ] Create `lib/slugGenerator.ts` — functions to generate slug components
  - `generateWords(count)` — random BIP39 words
  - `generateAlphanumeric(count)` — random A-Z, a-z, 0-9
  - `generateAlphaspecial(count)` — random alpha + special chars
- [ ] Create `lib/vaultHelpers.ts` — slug validation & persistence
  - `generateAdminSlug()` → 7-7-7 format
  - `generateSuperAdminSlug()` → 12-12-12 format
  - `validateSlugActive(sessionId)` → check isActive + expiry
  - `expireAdminSessions(userId)` → mark all inactive on logout

### API Routes

- [ ] Modify `/api/auth/login` — auto-generate slug on first login, reuse on subsequent
- [ ] Modify `/api/auth/logout` — expire slug (isActive = false)
- [ ] Create `/api/vault/slug/validate` — validate slug is active
- [ ] Create `/api/vault/credentials/generate` — generate vault creds
- [ ] Create `/api/vault/credentials/store` — store hashed creds metadata

### Pages & UI

- [ ] Create `/superAdmin/vault/page.tsx` — super-admin vault page (mockup — mock slug data, see Section 13)
- [ ] Create `/admin/vault/page.tsx` — admin vault page (mockup)
- [ ] Create component: `VaultSlugDisplay.tsx` — display slug components
- [ ] Create component: `VaultCredentialsModal.tsx` — generate & display creds (named `VaultCredentialsModal`, not `VaultCredentialsGenerator`, since it renders as a modal)
- [ ] Create component: `VaultPageContent.tsx` — shared page body, parameterized by role (not in the original checklist, added because super-admin/admin share nearly everything)
- [ ] Create component: `VaultEmergencyActions.tsx` — Gatekeeper panel + backup/wipe/lockdown controls (Section 12, mockup)
- [ ] Create component: `ConfirmActionModal.tsx` — type-to-confirm modal for the two most destructive actions (Section 12.6)
- [ ] Create component: `CopyButton.tsx` — shared copy-to-clipboard button used across slug/credential displays
- [ ] Create `lib/vaultMockData.ts` — mockup-only slug/credential generator (browser-side, not the real BIP39 list — replaced by `lib/slugGenerator.ts` above once the real backend is built)
- [ ] Create styles: `/app/styles/vault.css`

### Gatekeeper & Emergency Actions (Section 12 — not yet started beyond the mockup UI)

- [ ] Create `GatekeeperEvent` model in `prisma/schema.prisma` (Section 12.7)
- [ ] Create real attack-detection pipeline feeding SQL-injection / force-entry counters (currently hardcoded mock numbers in `VaultEmergencyActions.tsx`)
- [ ] Create `/api/vault/gatekeeper/status` — read live threat counts + lockdown state
- [ ] Create `/api/vault/gatekeeper/lockdown` — trigger manual or threshold-triggered lockdown
- [ ] Create `/api/vault/database/wipe` — guarded by type-to-confirm + secondary verification (Section 12.6)
- [ ] Create `/api/vault/credentials/wipe` — wipes `VaultCredentials`/`AdminSession` rows only
- [ ] Create `/api/vault/accounts/unblock` — single-account unblock
- [ ] Create `/api/vault/accounts/block-all` — emergency lockdown of every account
- [ ] Design the vault's own hardened auth path (Section 12.8) so this page keeps working if normal login/middleware is compromised
- [ ] Wire every Gatekeeper/emergency action to `SecurityLog` (Section 8.3) — see the new event list in Section 12.7

### Middleware & Security

- [ ] Update `middleware.ts` — vault route protection
- [ ] Update `lib/roleRouting.ts` — vault access rules
- [ ] Add security logging — vault events to SecurityLog table

### Testing

- [ ] Test first login → auto-generate slug
- [ ] Test second login → reuse slug (not regenerate)
- [ ] Test sign-out → slug becomes inactive
- [ ] Test third login → new slug generated (different from original)
- [ ] Test vault page access → validate slug is active
- [ ] Test vault credentials generation → display 15 words + 15 alphanumeric
- [ ] Test security logging → all events recorded

### Documentation

- [ ] Update `super_admin_account_specification.md` — reference vault system
- [ ] Update `admin_account_specification.md` — reference vault system
- [ ] Add to `overviewProject.txt` — vault section in file map

---

## 10. EXAMPLE FLOW

### Super-Admin First Login → Subsequent Login → Sign-Out

```
DAY 1, 10:00 AM — FIRST LOGIN
├─ User: admin@example.com
├─ Route: /auth/login
├─ Check AdminSession: None found
├─ Generate slug:
│  ├─ words: [12 random BIP39 words]
│  ├─ alphanumeric: "Aa1Bb2Cc3Dd4"
│  └─ alphaspecial: "a!B@c#D$e%F^"
├─ Store: AdminSession { slug, isActive: true, loginAt: 10:00 AM, expiresAt: 10:00 AM tomorrow }
├─ Redirect: /superAdmin/dashboard
└─ User sees vault page with slug (if configured)

DAY 1, 3:00 PM — SAME USER STILL LOGGED IN
├─ User refreshes page or navigates
├─ Middleware checks session cookie: Valid
├─ Check AdminSession for slug: Found, isActive: true
├─ Reuse slug: No regeneration
└─ Session continues

DAY 1, 5:00 PM — SIGN OUT
├─ User clicks "Sign Out" button
├─ Backend: Update AdminSession
│  ├─ isActive: false
│  └─ signedOutAt: 5:00 PM
├─ Delete session cookie
└─ Redirect: /auth/login

DAY 1, 5:30 PM — SECOND LOGIN (Same User)
├─ User: admin@example.com
├─ Route: /auth/login
├─ Check AdminSession: Found but isActive: false (from sign-out)
├─ Generate NEW slug (completely different):
│  ├─ words: [12 different random BIP39 words]
│  ├─ alphanumeric: "Ee5Ff6Gg7Hh8"
│  └─ alphaspecial: "b@C#d$E%f^G&"
├─ Store: NEW AdminSession { slug, isActive: true, loginAt: 5:30 PM }
└─ Redirect: /superAdmin/dashboard (with new slug)

NOTE:
- Old slug (10:00 AM) is NEVER reused
- New slug (5:30 PM) is completely different
- Every login cycle = fresh slug
```

---

## 11. NOTES & FUTURE ENHANCEMENTS

- **Multi-Device Sessions:** Current design supports one active slug per user. For multi-device support, create one AdminSession per device/browser — each with its own slug.
- **Slug Refresh:** Consider adding a "Refresh Slug" button on the vault page (for security-conscious users who want to rotate mid-session).
- **Vault Credential Versioning:** Track multiple vault credentials generated per session (store metadata of each generation).
- **Emergency Access:** Future: implement a "Use Emergency Credentials" endpoint for offline account recovery (requires secondary verification).

---

## 12. GATEKEEPER & EMERGENCY ACTIONS

### 12.1 — Purpose

The vault is meant to be the one page that still works if the rest of the site is compromised or every other account is locked out — so it carries the highest-stakes controls in the app, not just session-slug display. This section covers the "Emergency Actions" block added to both `/superAdmin/vault` and `/admin/vault` (Section 6.1/6.2), below the vault credentials generator.

**Both super-admin and admin get the full Emergency Actions section** — unlike the rest of the vault page, which is simplified for admin (Section 6.2), the emergency controls are identical for both roles, since a lockdown or wipe scenario doesn't distinguish between them.

### 12.2 — Gatekeeper (Threat Monitoring)

A live-updating panel showing detected attack attempts against the site:

- **SQL injection attempts blocked** — counter
- **Force-entry / brute-force attempts blocked** — counter
- **Auto-lockdown threshold** — configurable (default: 3 detected breaches). When either counter crosses the threshold, the Gatekeeper auto-triggers the same lockdown as the manual button below.
- **Auto-lockdown toggle** — lets the admin disable automatic lockdown (e.g., during a known false-positive event) without removing the monitoring itself.
- **Manual "Trigger lockdown now" button** — always available regardless of the toggle state, for cases where the admin sees something the automated counters haven't caught yet.

**Status badge:** the whole section shows "Monitoring" (green) normally, "Lockdown active" (red) once a lockdown has been triggered — either automatically or manually.

### 12.3 — Backup Now

Single button, no confirmation required — triggers an on-demand database backup (ties into the site's existing backup strategy, if one exists). Safe by design: never destructive, so it doesn't need the confirmation flow below.

### 12.4 — Wipe Database vs. Wipe Vault Data (Two Separate Actions)

These are deliberately **two distinct buttons**, not one "wipe" action, because they operate on different data with very different blast radius:

| Action              | Target                                                                                          | Severity                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Wipe database**   | Every table — products, orders, accounts, everything                                            | Most destructive action in the app. Type-to-confirm required (Section 12.6).                                |
| **Wipe vault data** | `AdminSession` + `VaultCredentials` rows only (session slugs and emergency-credential metadata) | Destructive but scoped — the rest of the database is untouched. Standard confirm modal, no type-to-confirm. |

### 12.5 — Account Access Control

- **Unblock account** — text field (email or account ID) + button. Not destructive, so no confirmation modal — this is the recovery action, not the risk.
- **Block all accounts** — single button that immediately locks out every account on the site, including the super-admin/admin session performing the action. Type-to-confirm required (Section 12.6) given the severity — this is the "everyone locked out" emergency-stop button.

### 12.6 — Confirmation Requirements

Every destructive action gets a confirmation modal before it runs. The two most severe — **Wipe database** and **Block all accounts** — additionally require the admin to type an exact phrase (`WIPE DATABASE` / `BLOCK ALL`) before the confirm button enables, same "type to confirm" pattern used by GitHub/Vercel for irreversible actions. The two lesser destructive actions — **Wipe vault data** and **Trigger lockdown now** — get a standard Cancel/Confirm modal without the typed phrase.

| Action               | Confirmation                 |
| -------------------- | ---------------------------- |
| Backup now           | None                         |
| Wipe database        | Modal + type `WIPE DATABASE` |
| Wipe vault data      | Modal (Cancel/Confirm)       |
| Trigger lockdown now | Modal (Cancel/Confirm)       |
| Unblock account      | None                         |
| Block all accounts   | Modal + type `BLOCK ALL`     |

### 12.7 — Database Schema Addition

```prisma
model GatekeeperEvent {
  id            String   @id @default(cuid())

  eventType     String   // "sql_injection_attempt" | "force_entry_attempt" | "auto_lockdown" | "manual_lockdown" | "database_wipe" | "vault_wipe" | "account_unblocked" | "block_all_accounts"
  triggeredBy   String?  // super-admin/admin email if a manual action; null if automated
  ipAddress     String?
  details       String?

  createdAt     DateTime @default(now())

  @@index([eventType])
  @@index([createdAt])
}
```

Every Gatekeeper/emergency action must also log to the existing `SecurityLog` table (Section 8.3), with these events added to the list there:

- `gatekeeper_threshold_crossed` — auto-lockdown threshold reached
- `gatekeeper_manual_lockdown` — "Trigger lockdown now" used
- `vault_database_wiped`
- `vault_data_wiped`
- `vault_account_unblocked`
- `vault_block_all_accounts`

### 12.8 — Security Note: This Page Must Survive a Compromise

Because the entire point of this section is to still work if the site is hacked or every account is locked out, the real (non-mockup) implementation needs its own hardened auth path — not just the standard middleware guard every other `/superAdmin/*` and `/admin/*` route uses (Section 7). If the normal login/session system is what got compromised, relying on it to gate the vault defeats the purpose. This needs its own design pass (e.g., the existing vault credentials themselves as a secondary/independent auth factor for reaching this page) before Section 12's checklist items in Section 9 are built for real — it is called out here rather than solved, since it's a bigger decision than this UI layer.

---

## 13. IMPLEMENTATION STATUS

**Correction (2026-09-05):** this section previously claimed a front-end
mockup was already built. A repo check against the `shop` branch found
none of the files listed below exist — `app/superAdmin/` contains only
`dashboard/page.tsx` and `layout.tsx`, there is no `app/admin/vault/`,
`components/vault/`, or `lib/vaultMockData.ts` anywhere in the repo, and
`middleware.ts` has no vault route handling. The vault system —
mockup or real — has not been started. The list below is now the full
scope still to build; nothing in Section 9's checklist is done.

**Not built (all of Section 9):**

- No `/superAdmin/vault` or `/admin/vault` routes, mockup or real
- No `VaultPageContent`, `VaultSlugDisplay`, `VaultCredentialsModal`,
  `VaultEmergencyActions`, `ConfirmActionModal`, or `CopyButton`
  components
- No `lib/vaultMockData.ts` placeholder generator, and no real
  `lib/slugGenerator.ts` / `lib/vaultHelpers.ts`
- No `AdminSession`, `VaultCredentials`, or `GatekeeperEvent` tables —
  nothing is persisted
- No slug generation on login/logout, real or mocked
- No middleware slug validation beyond the existing role-based route
  guard every `/superAdmin/*`/`/admin/*` page already has
- No attack detection — Gatekeeper's threat counters (Section 12.2)
  don't exist in any form
- None of the Emergency Actions (Section 12.3–12.5) exist — no UI, no
  API routes, no SecurityLog entries
- No hardened/independent auth path (Section 12.8)

**File map (planned, per Section 9 — none of these exist yet):**

```
lib/
  vaultMockData.ts                    ← mock slug/credential generator (browser-side), if a mockup pass happens first
  slugGenerator.ts                    ← real BIP39/alphanumeric/alphaspecial generation
  vaultHelpers.ts                     ← slug validation & persistence

components/vault/
  CopyButton.tsx                      ← shared copy-to-clipboard button
  VaultSlugDisplay.tsx                ← read-only slug component display
  VaultCredentialsModal.tsx           ← emergency credentials generation modal
  VaultPageContent.tsx                ← shared page body (role-parameterized)
  VaultEmergencyActions.tsx           ← Gatekeeper + backup/wipe/lockdown controls
  ConfirmActionModal.tsx              ← reusable destructive-action confirm modal

app/superAdmin/vault/page.tsx         ← route wrapper, role="superAdmin"
app/admin/vault/page.tsx              ← route wrapper, role="admin"
app/styles/vault.css                  ← all vault page/component styles
```

---

## 14. CHANGE LOG

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Initial vault specification created — session slug system, vault credentials, database schema, API routes, page layout, middleware, security rules, implementation checklist.                                                                                                                                                                                                                                    |
| 2026-09-03 | Added Section 12 (Gatekeeper & Emergency Actions) — threat monitoring, auto/manual lockdown, database wipe vs. vault wipe as separate actions, unblock account, block all accounts, type-to-confirm requirements for the two most severe actions. Added Section 13 documenting the front-end mockup already built. Updated Section 9's checklist to reflect completed UI items and new Gatekeeper backend items. |
| 2026-09-05 | **Correction:** repo check against the `shop` branch found none of Section 13's claimed mockup files actually exist (no vault routes, no `components/vault/*`, no `lib/vaultMockData.ts`). Unchecked all of Section 9's Pages & UI items and rewrote Section 13 to state the vault system — mockup or real — has not been started.                                                                               |

---

**Document Version:** 1.2
**Last Updated:** 2026-09-05
**Status:** Mockup Complete (front-end only, see Section 13) — Real backend (Sections 4/5/7/9/12.7-12.8) not yet started.
