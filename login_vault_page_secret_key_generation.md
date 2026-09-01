# Login Vault Page — Secret Key Generation (Super-Admin & Admin)

## 1. PURPOSE

The Login Vault is a secure, restricted-access page for super-admin and admin users to generate and manage secret vault credentials. These credentials provide backup access to critical admin functions if the primary authentication method fails or is compromised. The page is accessible only to users with `role = "superAdmin"` or `role = "admin"`.

## 2. ACCESS & AUTHORIZATION

- **Route:** `/superAdmin/vault/[slug]` (dynamic, session-scoped)
  - `[slug]` = unique session vault token generated on each login
  - Example: `/superAdmin/vault/f8a9c3d2-aaa111`
- **Required role:** superAdmin OR admin
- **Session validation:**
  - Slug MUST match current active session in AdminSession table
  - isActive = true in DB
  - Belongs to currently logged-in user
  - Not expired (within 24-hour window)
- **Middleware protection:** Route is blocked by middleware.ts for all other roles
- **Slug expiry:** On logout, slug is marked `isActive = false` → URL becomes invalid (404/redirect)
- **Audit logging:** Every access, generation, and view is logged to Rule 38 SecurityLog table with `eventType: "vault_access"` + `vaultSessionSlug`

## 3. HOW THE SESSION SLUG WORKS

### 3.1 — Slug Lifecycle

**On Successful Login:**

1. User logs in at `/auth/login` with email + password
2. Backend validates credentials → creates new AdminSession record
3. Generates unique `vaultSessionSlug` (e.g., `f8a9c3d2-aaa111`)
4. Stores slug in DB with `isActive = true`
5. Redirects user to `/superAdmin/vault/f8a9c3d2-aaa111`

**At Vault Page:**

1. Page checks if slug exists in AdminSession table
2. Verifies `isActive = true`
3. Verifies slug belongs to current logged-in user
4. If valid → show vault generator
5. If invalid/expired → redirect to dashboard with error

**On Logout:**

1. User clicks "Logout" button
2. Backend updates all active AdminSessions: `isActive = false`, `loggedOutAt = now()`
3. Session cookie is expired (httpOnly)
4. If user tries to visit old vault URL → page detects `isActive = false` → 404/redirect

**Next Login:**

1. Generate COMPLETELY NEW `vaultSessionSlug` (different from before)
2. Redirect to new vault URL: `/superAdmin/vault/e7b2f1c4-bbb222`
3. Old URL is permanently dead

---

## 4. PAGE LAYOUT & SECTIONS

### 4.1 — Header (Read-Only Info)

- Heading: "Security Vault — Admin Credentials"
- Subheading: "Generate backup access credentials for emergency admin access"
- Session info (top-right): "Session ID: f8a9c3d2-aaa111 | Expires in 24h"
- Warning banner (amber/gold, not green per Rule 22):
  ```
  ⚠ This vault generates ultra-high-entropy credentials. Store them securely offline.
     Never share, never commit to version control, never email unencrypted.
     This session expires in 24 hours. Log out when done.
  ```

### 4.2 — Main Section: Credential Generator

Three-part secret key generation flow (all in one UI):

#### Part 1: Word Seed (12 Random Words → Extract 6 Characters)

- Display: 12 randomly-selected words from a predefined dictionary (standard BIP39 word list, 1,624 words)
- Visual: Words displayed in a grid (4 columns on desktop, 2 on tablet, 1 on mobile), each word in a mono font, word background uses surface-active, no selection allowed (user-select: none)
- Extraction method: Take the **first letter of each word, then extract the first 6 letters** from the concatenated word sequence
  - Example: ["apple", "beach", "crown", "delta", "eagle", "frost", "guitar", "house", "island", "jungle", "kitten", "light"]
  - Extracted: A-B-C-D-E-F (first letter of each) + first 6 of those = "ABCDEF"
- Action: "Regenerate Words" button (neutral style) — creates a fresh set of 12 words immediately
- Copy button: "Copy Word Seed" → copies the 6-letter extraction + the 12 words as a backup readable form

#### Part 2: Number & Special Character Seed (12 Random Numbers & Special Chars → Extract 6 Digits)

- Generation: Create 12 random items from the set: {0-9 digits, !@#$%^&\*-\_+=}
  - Weighted: 50% digits, 50% special characters (so roughly 6 digits, 6 special chars)
- Display: Visual hex blocks or colored tokens, one per item, no selection allowed
  - Digits: light blue background
  - Special chars: light coral/red background
- Extraction method: Extract the **6 numeric digits only** from the 12 items
  - Example: 3, !, 7, @, 5, #, 2, $, 8, %, 9, & → Extract digits: 3, 7, 5, 2, 8, 9 → "375289"
- Action: "Regenerate Numbers" button (neutral style) — creates a fresh set of 12 items immediately
- Copy button: "Copy Number Seed" → copies the 6-digit extraction

#### Part 3: Alphanumeric Seed (12 Random Alphanumeric → Extract 6 Characters)

- Generation: Create 12 random characters from the set: {A-Z, a-z, 0-9}
  - Evenly distributed: 4 uppercase, 4 lowercase, 4 digits
- Display: Character blocks in mono font, each character in its own box, no selection allowed
  - Uppercase: light green background
  - Lowercase: light blue background
  - Digits: light yellow background
- Extraction method: Extract the **first 6 alphanumeric characters** from the 12
  - Example: [K, m, 3, Q, w, 7, L, p, 9, X, j, 5] → Extract first 6: K, m, 3, Q, w, 7 → "Km3Qw7"
- Action: "Regenerate Alphanumeric" button (neutral style) — creates a fresh set of 12 items immediately
- Copy button: "Copy Alphanumeric Seed" → copies the 6-character extraction

### 4.3 — Composite Secret Key Display

**Final secret credential** = Part 1 (6 chars) + Part 2 (6 digits) + Part 3 (6 chars) = **18-character ultra-high-entropy key**

- Display: Large monospace text, dark background (surface-active), center-aligned, selectable (user-select: text) to allow manual copying as last resort
- Example final key: `ABCDEFacecbd Km3Qw7` (visually broken into 3 groups of 6 for readability, but no spaces in actual key when copied)
  - Real format: `ABCDEFacecbdKm3Qw7`
- Copy button: "Copy Full Credential" (green accent button) — copies the complete 18-character key to clipboard, shows toast "✓ Credential copied to clipboard. Expires in 30 seconds." (clipboard auto-clears in 30s)
- QR Code button: "Generate QR Code" (secondary) — encodes the full key into a QR code for easy scanning/backup (modal with downloadable PNG)

### 4.4 — Generation Log (Read-Only History)

- Table: Paginated (10 per page), newest first
- Columns:
  - Generated At (date/time)
  - Generated By (admin email)
  - IP Address (last octet masked: 192.168.1.X)
  - Viewed (yes/no — has the key been accessed since generation?)
  - Status (active/revoked/expired)
  - Session ID (which session generated this key)
  - Actions: View Details (modal), Revoke (if active), Delete Log Entry
- Filtering: By date range, generated by admin, status
- Sorting: Newest first (default), oldest first
- Important note: History is tied to current session. If you log out and log back in, you'll see a NEW history log with the new session slug.

### 4.5 — Credential Storage & Security Section

**Offline Storage Instructions** (read-only callout, gold accent):

```
HOW TO STORE YOUR CREDENTIAL SAFELY:

1. DO NOT SAVE IN PASSWORD MANAGER (most password managers auto-sync to cloud)
2. DO NOT EMAIL, SLACK, OR SHARE DIGITALLY
3. DO print or write the 18-character key on a physical piece of paper
4. DO store that paper in a locked safe, fireproof box, or off-site security deposit
5. DO destroy the paper copy once you have memorized the key (recommended)
   OR keep it locked away for emergency use only

This credential provides full admin access. Treat it like your house key.
Once lost or compromised, REVOKE IT IMMEDIATELY and generate a new one.
```

**One-Time Credentials Toggle** (future feature, Phase 2):

- Checkbox: "Make this a one-time-use credential" (unchecked by default)
- When checked: The 18-character key can be used ONCE, then auto-revokes
- Useful for: emergency one-time access, delegated temporary admin tasks

## 5. API ENDPOINTS

### POST /api/admin/vault/generate

**Purpose:** Generate a new 18-character credential

**Request:**

```json
{
  "description": "Emergency backup access — Sept 2026"
}
```

**Response (success):**

```json
{
  "success": true,
  "data": {
    "credentialId": "uuid",
    "wordSeed": ["apple", "beach", "crown", ...],
    "wordExtraction": "ABCDEF",
    "numberSeed": ["3", "!", "7", "@", "5", "#", "2", "$", "8", "%", "9", "&"],
    "numberExtraction": "375289",
    "alphanumericSeed": ["K", "m", "3", "Q", "w", "7", "L", "p", "9", "X", "j", "5"],
    "alphanumericExtraction": "Km3Qw7",
    "fullCredential": "ABCDEFacecbdKm3Qw7",
    "createdAt": "2026-09-01T14:35:22Z",
    "expiresAt": null,
    "qrCode": "data:image/png;base64,..."
  },
  "message": "Credential generated successfully."
}
```

### POST /api/auth/login

**Purpose:** Generate new vault session slug on successful login

**Request:**

```json
{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```

**Response (success):**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "admin@example.com",
    "role": "superAdmin",
    "vaultSlug": "f8a9c3d2-aaa111"
  },
  "message": "Signed in successfully."
}
```

**Frontend action on success:**

```typescript
router.push(`/superAdmin/vault/${vaultSlug}`);
```

---

### POST /api/auth/logout

**Purpose:** Expire all active vault sessions on logout

**Request:** (no body needed)

**Response:**

```json
{
  "success": true,
  "data": null,
  "message": "Signed out successfully. Vault session expired."
}
```

**Backend action:**

```typescript
// Mark all active AdminSessions as inactive
await prisma.adminSession.updateMany({
  where: { adminId: userId, isActive: true },
  data: { isActive: false, loggedOutAt: new Date() },
});
```

---

### GET /api/admin/vault/[slug]/validate

**Purpose:** Validate that a vault slug is still active (called on page load)

**Request:** (slug in URL path)

**Response (valid):**

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "adminId": "uuid",
    "createdAt": "2026-09-01T14:35:22Z",
    "expiresAt": "2026-09-02T14:35:22Z"
  },
  "message": "Session is valid."
}
```

**Response (invalid):**

```json
{
  "success": false,
  "data": { "isValid": false },
  "message": "Session expired or not found.",
  "error": "VAULT_SESSION_EXPIRED"
}
```

---

### GET /api/admin/vault/history

**Purpose:** Retrieve the credential generation history for current session (paginated)

**Query params:**

- `slug` (required, identifies which session's history to fetch)
- `page` (default: 1)
- `limit` (default: 10, max: 50)
- `status` (filter: "active" | "revoked" | "expired")
- `dateFrom`, `dateTo` (ISO date filter)

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionSlug": "f8a9c3d2-aaa111",
    "credentials": [
      {
        "credentialId": "uuid",
        "generatedBy": "admin@example.com",
        "createdAt": "2026-09-01T14:35:22Z",
        "ipAddress": "192.168.1.X",
        "status": "active",
        "viewed": false,
        "description": "Emergency backup access — Sept 2026"
      }
    ],
    "totalCount": 3,
    "totalPages": 1,
    "page": 1
  },
  "message": "History retrieved."
}
```

---

### POST /api/admin/vault/{credentialId}/revoke

**Purpose:** Immediately revoke an active credential

**Request:**

```json
{
  "slug": "f8a9c3d2-aaa111",
  "reason": "Compromised — changing admin password"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "credentialId": "uuid",
    "status": "revoked",
    "revokedAt": "2026-09-01T15:42:11Z"
  },
  "message": "Credential revoked successfully."
}
```

---

### DELETE /api/admin/vault/{credentialId}

**Purpose:** Remove a credential from the log (admin audit trail only)

**Request:**

```json
{
  "slug": "f8a9c3d2-aaa111"
}
```

**Response:**

```json
{
  "success": true,
  "data": null,
  "message": "Credential deleted from log."
}
```

---

## 6. DATABASE SCHEMA (Prisma)

```prisma
// NEW: Admin Session (tracks login sessions with unique vault slugs)
model AdminSession {
  id                 String    @id @default(cuid())

  // Admin info
  adminId            String
  admin              User      @relation(fields: [adminId], references: [id], onDelete: Cascade)

  // Session vault slug (unique per login)
  vaultSessionSlug   String    @unique  // e.g., "f8a9c3d2-aaa111"

  // Timing
  createdAt          DateTime  @default(now())
  expiresAt          DateTime  // When session ends (24h by default)
  loggedOutAt        DateTime? // When they actually logged out

  // IP & device tracking
  ipAddress          String?   // Last octet masked: 192.168.1.X
  deviceFingerprint  String?   // SHA-256 hash of device characteristics

  // Status
  isActive           Boolean   @default(true) // False after logout

  // Relationship to vault credentials generated in this session
  vaultCredentials   VaultCredential[]

  @@index([adminId])
  @@index([vaultSessionSlug])
  @@index([isActive])
  @@index([createdAt])
}

// UPDATED: Vault Credential (now tied to a session)
model VaultCredential {
  id                      String    @id @default(cuid())

  // Session relationship (credentials are session-scoped)
  sessionId               String
  session                 AdminSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Extraction components (saved for audit trail)
  wordExtraction          String    // 6-char extraction from 12 words
  numberExtraction        String    // 6-digit extraction from 12 numbers/special
  alphanumericExtraction  String    // 6-char extraction from 12 alphanumeric

  // Full credential (hashed for security — never store plaintext in DB)
  credentialHash          String    // bcrypt hash of the full 18-char key
  fullCredentialLength    Int       @default(18) // always 18

  // Metadata
  generatedByAdminId      String
  generatedByAdmin        User      @relation(fields: [generatedByAdminId], references: [id])
  createdAt               DateTime  @default(now())
  expiresAt               DateTime? // null = never expires
  revokedAt               DateTime? // null = not revoked
  status                  String    @default("active") // active | revoked | expired
  description             String?   // admin notes
  isOneTimeUse            Boolean   @default(false)
  isUsed                  Boolean   @default(false) // toggled when one-time key is used

  // Audit trail
  ipAddressGenerated      String?   // IP that generated the key
  viewedAt                DateTime? // when the key was first viewed/copied
  viewedByAdmin           String?   // admin email that viewed it

  @@index([status])
  @@index([sessionId])
  @@index([generatedByAdminId])
  @@index([createdAt])
}

// UPDATED: User model
model User {
  id                 String    @id
  email              String    @unique
  password           String    // hashed
  role               String    // "superAdmin" | "admin" | "buyer"

  // New relationships
  adminSessions      AdminSession[] // Multiple login sessions per admin
  vaultCredentials   VaultCredential[] // Credentials generated by this admin

  // ... other existing fields
}
```

## 7. SECURITY & COMPLIANCE (Rules 6, 18, 32, 38, 40)

- **Credential Storage:** Full 18-char key is hashed (bcrypt) before saving to DB. Never store plaintext.
- **Session-Scoped Access:** Vault URL is unique per login. Slug is marked `isActive = false` on logout → old URL becomes invalid
- **URL Expiry:** Previous vault URLs expire immediately after logout (404/redirect) → cannot be reused or shared
- **Input Sanitization:** Description field sanitized per Rule 18.1 (forbidden chars stripped)
- **Rate Limiting:** Max 3 credential generations per admin per hour (Rule 32.1), max 3 login attempts per 15 minutes
- **Clipboard Clear:** Copied credentials auto-clear from clipboard after 30 seconds (via JS `navigator.clipboard` API)
- **Audit Logging:** Every generation, view, revoke, deletion, and session access logged to Rule 38 SecurityLog with `vaultSessionSlug` tracking
- **Device Fingerprinting:** Access to vault endpoint includes device fingerprint check per Rule 38 — new device flagged in security log
- **Session Validation:** Vault page validates slug matches current active AdminSession before rendering
- **Impossible Travel Detection:** Geolocation check blocks vault access if location jumped between logins (Rule 38.5)
- **CSRF Protection:** All POST requests validated via CSRF token (Rule 32.2)
- **Backup & Recovery:** Credentials are part of database backups per Rule 40. Full credentials hashes only — plaintext never stored or backed up.

## 7. UI/UX STANDARDS (Rule 22, 25, 33, 34)

- Loading state: Skeleton loaders on each part (Part 1, 2, 3) while generating
- Empty state: If no credentials yet, show "No credentials generated yet" + "Generate Your First Credential" button
- Error state: Toast errors (e.g., "✕ Generation failed. Please try again.")
- Success state: Toast "✓ Credential generated. Copy it now." + highlight the full key field
- Hover states: All buttons highlight (border color → accent green)
- Focus-visible: All buttons, links, inputs have 2px outline (Rule 33.3)
- Animations: Parts fade in staggered (Part 1 @ 0ms, Part 2 @ 150ms, Part 3 @ 300ms)
- Responsive:
  - Desktop: 3-column layout (Part 1 | Part 2 | Part 3 stacked vertically, full width)
  - Tablet: 2-column (Part 1 & 2 left, Part 3 right) or single-column if narrow
  - Mobile: Single column (all 3 parts stack)

## 8. COMPONENTS & FILES

**Dynamic Vault Route (with session slug):**

- `app/superAdmin/vault/[slug]/page.tsx` — **main vault page (validates slug on load)**
  - Checks if slug exists in AdminSession table
  - Verifies `isActive = true`
  - Redirects to dashboard if expired/invalid
  - Renders credential generator + history log
- `app/superAdmin/vault/[slug]/not-found.tsx` — fallback for invalid/expired slugs

**Credential Generator Components:**

- `components/vault/CredentialGenerator.tsx` — the 3-part generator UI
- `components/vault/WordSeedGenerator.tsx` — Part 1: words extraction
- `components/vault/NumberSeedGenerator.tsx` — Part 2: numbers/special extraction
- `components/vault/AlphanumericSeedGenerator.tsx` — Part 3: alphanumeric extraction
- `components/vault/FullCredentialDisplay.tsx` — composite 18-char display + copy/QR

**History & Management:**

- `components/vault/GenerationLog.tsx` — history table with pagination & filters
- `components/vault/SessionInfo.tsx` — displays current session ID + expiry time (header)

**API Routes:**

- `app/api/auth/login/route.ts` — **UPDATED: generates vaultSessionSlug on successful login**
- `app/api/auth/logout/route.ts` — **UPDATED: expires all active AdminSessions**
- `app/api/admin/vault/[slug]/validate/route.ts` — validate slug is active (called on page load)
- `app/api/admin/vault/generate/route.ts` — credential generation endpoint
- `app/api/admin/vault/history/route.ts` — history retrieval endpoint (filtered by slug)
- `app/api/admin/vault/[credentialId]/revoke/route.ts` — revocation endpoint
- `app/api/admin/vault/[credentialId]/delete/route.ts` — deletion endpoint

**Utilities & Helpers:**

- `app/styles/vault.css` — vault page styles (grid, tokens, seed display, log table)
- `lib/bip39Words.ts` — BIP39 word list (1,624 words for Part 1 generation)
- `services/credentialGenerator.ts` — functions for generating seeds + extractions
- `services/credentialValidator.ts` — verify credential format + entropy checks
- `services/sessionManager.ts` — **NEW: functions for creating/validating/expiring AdminSessions**
  - `generateVaultSessionSlug()` — create unique slug
  - `validateVaultSlug(slug, userId)` — check if valid & active
  - `expireAdminSessions(userId)` — mark all sessions inactive on logout

## 9. ROUTING & REDIRECTS

**Login Flow:**

1. User logs in at `/auth/login` with email + password
2. Success → backend generates unique `vaultSessionSlug` (e.g., `f8a9c3d2-aaa111`)
3. Stores in AdminSession table with `isActive = true`
4. Redirects to `/superAdmin/vault/f8a9c3d2-aaa111`

**At Vault Page:**

- URL: `/superAdmin/vault/[slug]`
- Page validates slug:
  - Exists in AdminSession table? ✓
  - `isActive = true`? ✓
  - Belongs to current user? ✓
  - If all pass → render vault generator
  - If any fail → redirect to `/superAdmin/dashboard?error=vault-expired`

**Logout Flow:**

1. User clicks "Logout"
2. Backend calls `/api/auth/logout`
3. Marks all AdminSessions `isActive = false` + sets `loggedOutAt`
4. Session cookie expires
5. Old vault URL is now DEAD

**After Logout:**

- User tries to visit old `/superAdmin/vault/f8a9c3d2-aaa111`
- Page check: `isActive = false` ✗
- Redirects to `/superAdmin/dashboard?error=vault-expired`
- Toast: ⚠️ "Your vault session expired. Please log in again."

**Unauthorized Access:**

- Non-admin tries to access `/superAdmin/vault/any-slug` → 403 (middleware blocks)
- Already logged out → `/auth/login?next=/superAdmin/vault` (no slug, must re-login)

**Next Login:**

- Generates completely NEW slug (never reuse old ones)
- Redirect to new URL: `/superAdmin/vault/e7b2f1c4-bbb222`

## 10. FUTURE ENHANCEMENTS (Phase 2+)

- **One-time credentials:** Checkbox to make credential single-use (auto-revoke after first use)
- **Credential expiration:** Set auto-expiry date (e.g., "Expires in 30 days")
- **Cryptographic signing:** Sign the credential with a secondary private key for extra verification
- **Offline credential verification:** Decentralized proof-of-access without hitting the server
- **Multi-admin approval:** Require 2+ admins to approve new credential generation (change management)
- **Credential escrow:** Store backup credentials in a third-party secure vault (e.g., Vault by HashiCorp)
- **Hardware token support:** Generate credentials for hardware security keys (YubiKey, etc.)

## 9.1 — Session Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ SUPER-ADMIN SESSION LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────┘

STEP 1: LOGIN
  ┌─────────────────────┐
  │ /auth/login         │
  │ Email: admin@ex.com │
  │ Password: ••••      │
  └─────────────────────┘
           ↓ [POST]
  Backend validates credentials
           ↓
  Creates new AdminSession record
  {
    vaultSessionSlug: "f8a9c3d2-aaa111"
    isActive: true
    createdAt: 2026-09-01T14:35:22Z
    expiresAt: 2026-09-02T14:35:22Z
  }
           ↓
  Issues session cookie (HttpOnly)
           ↓
  Redirects to: /superAdmin/vault/f8a9c3d2-aaa111
           ↓
STEP 2: AT VAULT PAGE
  ┌──────────────────────────────────────────────┐
  │ /superAdmin/vault/f8a9c3d2-aaa111            │
  │                                              │
  │ Page loads → validates slug                  │
  │   - Exists in DB? ✓                          │
  │   - isActive = true? ✓                       │
  │   - Belongs to me? ✓                         │
  │                                              │
  │ ✓ Vault Generator Available                  │
  │   • Generate Part 1, 2, 3                    │
  │   • View History                             │
  │   • Copy Credentials                         │
  └──────────────────────────────────────────────┘
           ↓ [User does stuff]
  Generates credentials, views history
           ↓
STEP 3: LOGOUT
  ┌─────────────────────┐
  │ [Logout Button]     │
  └─────────────────────┘
           ↓ [POST /api/auth/logout]
  Backend finds all AdminSessions for user
           ↓
  Sets: isActive = false, loggedOutAt = now()
           ↓
  Expires session cookie
           ↓
  Clear-Site-Data header sent
           ↓
  Redirects to: /auth/login
           ↓
STEP 4: OLD VAULT URL NOW DEAD
  User tries: /superAdmin/vault/f8a9c3d2-aaa111
           ↓
  Page checks DB: isActive = false ✗
           ↓
  Redirects: /superAdmin/dashboard?error=vault-expired
           ↓
  Toast: ⚠️ "Your vault session expired. Please log in again."
           ↓
STEP 5: NEXT LOGIN
  Login again at /auth/login
           ↓
  Backend creates NEW AdminSession
  {
    vaultSessionSlug: "e7b2f1c4-bbb222"  ← Different from before!
    isActive: true
  }
           ↓
  Redirects to: /superAdmin/vault/e7b2f1c4-bbb222  ← New URL
           ↓
  Old URL f8a9c3d2-aaa111 remains dead forever
```

---

## 10. TESTING CHECKLIST

**Session & Slug Tests:**

- [ ] Login generates unique vault slug (e.g., `f8a9c3d2-aaa111`)
- [ ] Redirects to `/superAdmin/vault/[slug]` after login
- [ ] Vault page validates slug exists + is active
- [ ] Different logins generate different slugs (never reuse)
- [ ] Old slug becomes invalid (404/redirect) after logout
- [ ] Logout marks AdminSession `isActive = false`
- [ ] Attempting old vault URL after logout → "vault expired" error
- [ ] Cannot access vault with someone else's slug (ownership check)

**Credential Generation Tests:**

- [ ] Generate credential successfully → full 18-char key displays
- [ ] Part 1 extraction: 6 letters from 12 words ✓
- [ ] Part 2 extraction: 6 digits from 12 numbers/special ✓
- [ ] Part 3 extraction: 6 chars from 12 alphanumeric ✓
- [ ] "Regenerate" buttons update each part independently
- [ ] Copy button copies full credential to clipboard
- [ ] Clipboard auto-clears after 30 seconds
- [ ] QR code generates and displays correctly
- [ ] QR code is downloadable as PNG

**History & Management Tests:**

- [ ] History log shows all generated credentials in current session
- [ ] Revoke button changes credential status to "revoked"
- [ ] Delete button removes entry from log
- [ ] History is session-scoped (new login = new history)
- [ ] Filters work: by date range, by status, by admin
- [ ] Pagination works: 10 per page, newest first

**Security Tests:**

- [ ] Rate limit blocks >3 generations in 60 minutes
- [ ] Rate limit blocks >3 logins per 15 minutes
- [ ] Audit logs record every vault access + generation + revoke
- [ ] Device anomaly detection triggers on new device
- [ ] CSRF validation blocks requests without token
- [ ] Unauthorized role (buyer, etc.) sees 403 Forbidden
- [ ] Session cookie is HttpOnly + Secure + SameSite=strict
- [ ] Slug validation fails for expired sessions

**UI/UX Tests:**

- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Loading states show while generating credentials
- [ ] Error toasts appear on generation failure
- [ ] Success toasts appear on generation + copy
- [ ] "Session expires in X hours" displayed in header
- [ ] Warning banner visible at top (never share credentials)
- [ ] All buttons have proper hover + focus-visible states

**Edge Cases:**

- [ ] User logs in, generates credential, logs out, logs in again
  - New vault URL should work
  - Old vault URL should be dead
  - New history should be separate from old
- [ ] User logs in on 2 different browsers/devices
  - Each browser gets its own unique slug
  - Can use vault simultaneously on both
  - Logout on one browser expires only that session (not both)
- [ ] User tries to visit vault URL in incognito/private window
  - No session cookie → redirect to login
- [ ] Session expires (24h timeout) while user is on page
  - Periodic validation check detects expiry
  - Redirects to dashboard with "session expired" message
