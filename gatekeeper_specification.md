# Gatekeeper & Device Ban — Feature Specification Document

## 1. PURPOSE & OVERVIEW

The Gatekeeper is a security layer that sits in front of every request — buyer, admin, and super-admin alike, including unauthenticated login and registration attempts — and blocks a **device** (not just an account, not just an IP) that has been caught breaching one of the checks in Section 4.

It is built entirely on top of infrastructure that already exists in this project:

- **Rule 38** (`SecurityLog`, `logSecurityEvent()`, device fingerprinting, geolocation, anomaly detection)
- **Rule 39** (SQL injection attempt scanner)
- **Rule 32.1** (rate limiting)

The Gatekeeper does not replace any of these — it is a consumer of the events they already produce. When a breach-eligible `SecurityLog` event is written, the Gatekeeper decides whether that device has now earned a ban, and if so, writes a `DeviceBan` row that every future request checks against.

**Why device, not account or IP:**

- **Account-only bans** are useless against an attacker who just creates a new account or tries a different one.
- **IP-only bans** are unreliable — IPs are shared (school/office networks, mobile carriers) or dynamic (home ISPs rotate them), causing both false positives (banning innocent people on the same network) and easy evasion (attacker just switches networks/VPN).
- **Device fingerprint** persists across accounts and across IP changes as long as the attacker keeps using the same browser/device, making it a meaningfully harder wall to route around than either alone.

**Known limitation (documented honestly, not hidden):** a device fingerprint can still be changed — clearing cookies, using a different browser, or a different physical device resets it. The Gatekeeper is a deterrent that meaningfully raises the cost of repeated attacks, not a perfect, unspoofable barrier. It is layered on top of, never a replacement for, Rule 32.1's rate limiting and Rule 18.2's ORM-only query safety.

---

## 2. SCOPE

Applies to **all account types and all unauthenticated entry points**:

- Buyer login, registration, and every `/buyer/*` route
- Admin login and every `/admin/*` route
- Super-Admin login and every `/superAdmin/*` route
- Public `/auth/login` and `/auth/register` routes (before any account/role even exists)

The check runs in `middleware.ts`, ahead of the existing role-based redirect logic (Section 2.3 of the super-admin spec, Rule 31.11) — a banned device is stopped before the app even checks what role it's claiming to be.

---

## 3. GATEKEEPER FINGERPRINT

Rule 38.4's device fingerprint (used for account-takeover anomaly detection) includes client-supplied data — screen size, timezone, browser language — gathered via JS after the page has already loaded. The Gatekeeper has to make its decision in `middleware.ts`, which runs at the edge **before** any page or client JS executes, so it cannot wait for that payload.

The Gatekeeper therefore uses a narrower, header-only fingerprint — computable from the raw request alone, identical whether the check happens in middleware or in an API route handler:

```javascript
/**
 * generateGatekeeperFingerprint
 * Header-only device fingerprint — computable at the edge in middleware.ts,
 * before any client JS runs. Deliberately narrower than Rule 38.4's full
 * fingerprint (which adds screen size/timezone/canvas for deeper per-account
 * anomaly detection) so it can gate every single request, not just logged-in ones.
 */
function generateGatekeeperFingerprint(headers) {
  const components = [
    headers.get("user-agent")?.toLowerCase().trim(),
    headers.get("accept-language"),
    headers.get("accept-encoding"),
  ]
    .filter(Boolean)
    .join("|");

  return crypto.createHash("sha256").update(components).digest("hex");
}
```

**Rule:** every route handler that logs a breach-eligible event (Section 4) must compute `deviceFingerprint` using this SAME algorithm — never Rule 38.4's fuller client-info version — so that a ban decision and a middleware ban check always agree on the same value for the same device. Rule 38.4's richer fingerprint continues to exist separately, unchanged, for its own purpose (Section 38.8 anomaly detection on already-authenticated accounts).

---

## 4. BREACH TRIGGERS

Two tiers. Severe breaches ban on the first occurrence. Everything else needs a pattern (3 strikes) before it's treated as an attack rather than an honest mistake.

### 4.1 — Instant Ban (1 occurrence = ban)

| Event                                | eventType (Rule 38 table) | Why instant                                                                                                                                                            |
| ------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL Injection attempt                | `sql_injection_attempt`   | A single attempt is already an attack signature, not a mistake — Rule 39's scanner only fires on actual malicious query patterns                                       |
| Impossible-travel / location anomaly | `location_anomaly`        | Rule 38.8's great-circle-distance check already requires a physically impossible jump (e.g. 13,000km in 5 hours) — this is never a false positive from normal behavior |

### 4.2 — Strike-Based Ban (3 occurrences within a rolling 24-hour window = ban)

| Event                           | eventType                                                                                                                                                            | Why strikes, not instant                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brute-force login               | `login_failed` (beyond Rule 32.1's 5-attempts/15-min throttle)                                                                                                       | A buyer can genuinely fumble their own password a few times                                                                                                                        |
| Wrong-role route access         | `admin_login_denied`                                                                                                                                                 | Could be an authenticated buyer clicking a stale bookmarked admin link, not necessarily malicious the first time                                                                   |
| Registration abuse              | `registration_abuse` (**new eventType**, added by this spec)                                                                                                         | Multiple accounts created from the same device in a short window — could be a household/shared computer once, but a pattern signals bot/spam signups                               |
| Repeated rate-limit hits        | `rate_limit_hit` on Rule 32.1's priority endpoints (login, forgot-password, contact form, payment)                                                                   | One rate-limit hit is normal traffic; hitting it 3 separate times signals sustained pressure on the endpoint                                                                       |
| Failed account recovery attempt | `password_recovery_failed` (wrong email OTP, wrong Telegram OTP, or wrong security-question answer — per `buyer_password_recovery_specification.md`'s 3-method flow) | Security question answers have low entropy — a device repeatedly guessing wrong across any of the 3 recovery methods is the same pattern as brute-force login, treated identically |

**Strike counting logic:** on every write of a strike-eligible event, count `SecurityLog` rows matching `{ deviceFingerprint, eventType, createdAt: { gte: now - 24h } }`. If the count reaches 3, ban immediately. No separate counter table is needed — `SecurityLog` (Rule 38) is already the source of truth, and it's already indexed on `deviceFingerprint` and `createdAt`.

**Registration abuse detection specifics:** triggered when 3+ accounts are created from the same `deviceFingerprint` within a rolling 24-hour window, checked at the end of the registration route handler (after the new account is committed) — logs `registration_abuse` and lets the strike counter above take over from there.

---

## 5. BAN MECHANISM

- **Ban duration: permanent.** A device stays banned until a super-admin manually unbans it (Section 8) — no auto-expiry, no escalating temporary tiers. This is deliberate: it keeps the model simple and puts a human super-admin in the loop for every reinstatement, rather than trusting a timer to know an attacker has actually given up.
- **One row per device.** A device can only have one active ban — a second breach from an already-banned device is blocked by the ban itself before it can even reach the route handler that would log a new strike.

### 5.1 — Data Model

```prisma
model DeviceBan {
  id                String    @id @default(cuid())
  deviceFingerprint String    @unique
  reason            String                          // human-readable, e.g. "3x admin_login_denied within 24h"
  triggerEventType  String                          // the eventType that caused the ban
  strikeCount       Int?                             // null for instant-ban triggers, 3 for strike-based
  relatedLogIds     String[]                         // SecurityLog row IDs that led to the ban, for audit review

  bannedAt          DateTime  @default(now())
  bannedBy          String    @default("system")     // "system" (auto) — manual super-admin bans also supported, see 5.2

  isActive          Boolean   @default(true)
  unbannedAt         DateTime?
  unbannedBy         String?                          // super-admin's ID/email
  unbanNote          String?                          // required when unbanning, see Section 8

  createdAt         DateTime  @default(now())

  @@index([deviceFingerprint])
  @@index([isActive])
}
```

### 5.2 — Manual Bans (super-admin override, in addition to automatic ones)

A super-admin may also ban a device directly from the Security Logs page (Rule 38.9) — e.g. spotting a suspicious pattern that hasn't yet crossed the automatic 3-strike threshold. Manual bans use the same `DeviceBan` model with `bannedBy` set to the super-admin's ID instead of `"system"`, and `triggerEventType: "manual"`.

---

## 6. MIDDLEWARE INTEGRATION

Runs as the FIRST check in `middleware.ts` — before Section 2.3's role-based redirect logic, before any account/session lookup.

```typescript
/**
 * GATEKEEPER CHECK
 * Runs before any role-based routing. Computes the header-only device
 * fingerprint and checks it against the DeviceBan table. A banned device
 * is stopped here — it never reaches the role check, never reaches a
 * page or API route, regardless of which account type it's using.
 */
export async function middleware(request: NextRequest) {
  const fingerprint = generateGatekeeperFingerprint(request.headers);
  const activeBan = await checkDeviceBan(fingerprint); // cached lookup, see 6.1

  if (activeBan) {
    // Generic block response — never reveal WHY the device was banned,
    // never confirm/deny whether a specific account exists.
    return NextResponse.rewrite(new URL("/blocked", request.url));
  }

  // ... existing role-based middleware logic continues unchanged below
}
```

### 6.1 — Performance note

Checking a database on every single request would add latency to every page load. The ban list must be read through a short-lived cache (e.g. an edge KV store or an in-memory cache with a ~60-second TTL) rather than a direct DB query per request — a newly-banned device may take up to that TTL to actually be blocked, which is an acceptable trade-off since the strike/instant-ban logic itself already took at least one full request to trigger.

---

## 7. BLOCKED RESPONSE

- Route: `/blocked` — a static, generic page. Never account-specific, never explains which rule was tripped, never confirms whether an account tied to that device exists.
- Message: **"Access to this service has been restricted."** — nothing more specific. This is deliberate: giving an attacker feedback on exactly which trigger fired teaches them how to stay just under the threshold next time.
- No login form, no password reset link, no support contact form rendered on this page (a support contact form would just become a new abuse vector for a banned device to keep probing). A legitimate user who believes they were banned in error has no in-app path — this is intentional friction; see Section 9.4.

---

## 8. SUPER-ADMIN MANAGEMENT PAGE (`/superAdmin/gatekeeper`)

**Purpose:** the only place any ban can be lifted. Mirrors the Rule 38.9 Security Logs page pattern.

**Content:**

- Paginated table (25 per page, newest first): Device Fingerprint (truncated display), Trigger Event, Reason, Strike Count, Banned At, Banned By, Status (Active/Unbanned)
- Filters: Trigger Event Type, Status, Date Range
- Row expand: shows the linked `SecurityLog` entries (`relatedLogIds`) that led to the ban — device type, browser, OS, city-level geolocation (Rule 38.5's 2-decimal rounding, never precise location)

**Row Actions:**

- **Unban** — confirmation modal (Rule 34.4 pattern), REQUIRES a note explaining why (`unbanNote`) — never a one-click unban. Sets `isActive: false`, `unbannedAt`, `unbannedBy`.
- **Manual Ban** (from Security Logs page, Section 5.2) — same confirmation modal pattern, requires a reason.

**Security Logs:** every ban and unban is itself logged back to `SecurityLog` — `device_banned` / `device_unbanned` eventTypes (added to Rule 38's event table by this spec).

---

## 9. API ENDPOINTS

### GET /api/superadmin/gatekeeper/bans

**Permission:** super-admin only.

**Query Params:** page, limit, triggerEventType, isActive, dateFrom, dateTo

**Response:**

```json
{
  "success": true,
  "data": { "bans": [...], "totalCount": 14, "totalPages": 1, "page": 1 },
  "message": "Device ban list retrieved."
}
```

### POST /api/superadmin/gatekeeper/bans

**Permission:** super-admin only. Manual ban (Section 5.2).

**Request:**

```json
{
  "deviceFingerprint": "sha256-hash",
  "reason": "Repeated probing of /admin routes just under the strike threshold."
}
```

### PUT /api/superadmin/gatekeeper/bans/[banId]/unban

**Permission:** super-admin only.

**Request:**

```json
{
  "unbanNote": "Confirmed with buyer via support email — was their own repeated login typos, not an attack."
}
```

**Response:**

```json
{
  "success": true,
  "data": { "banId": "uuid", "isActive": false },
  "message": "Device unbanned successfully."
}
```

---

## 10. RULES & REQUIREMENTS

- Never let the Gatekeeper check block or slow down legitimate traffic beyond the cache TTL in Section 6.1 — this is a security feature, not an excuse to degrade normal performance.
- The `/blocked` page must never leak which specific rule was tripped (Section 7) — same principle as Rule 34.1's error messages being human-readable, but inverted here: vague is the correct choice for security responses, specific is correct for ordinary errors.
- Unbanning always requires a note (Section 8) — no exceptions, mirrors Rule 34.4's confirmation-modal discipline for destructive/security-sensitive actions.
- The Gatekeeper fingerprint (Section 3) and Rule 38.4's account-anomaly fingerprint are DIFFERENT values computed DIFFERENTLY — never conflate them or assume one can substitute for the other.
- Registration abuse detection (Section 4.2) applies even to `/auth/register` before any role or session exists — the Gatekeeper's scope (Section 2) explicitly includes pre-authentication traffic.
- This feature depends on Rule 38's `SecurityLog` infrastructure already existing (device fingerprinting, event logging) — it is additive, not a replacement.

---

## 11. TESTING & VERIFICATION CHECKLIST

- [ ] A device that triggers `sql_injection_attempt` once is banned immediately
- [ ] A device that triggers `location_anomaly` once is banned immediately
- [ ] A device needs exactly 3 `login_failed` events within 24h (beyond Rule 32.1's throttle) before banning — 2 events does not ban
- [ ] Strike count resets correctly outside the rolling 24h window (a 4th `login_failed` 25 hours after the first does not carry over the earlier count)
- [ ] A banned device is blocked on `/buyer/*`, `/admin/*`, `/superAdmin/*`, AND `/auth/login`/`/auth/register` — not just one account type
- [ ] `/blocked` page never reveals the ban reason or confirms account existence
- [ ] Only super-admin can view `/superAdmin/gatekeeper` or call its API routes
- [ ] Unban requires a non-empty `unbanNote` — request is rejected without one
- [ ] `device_banned` and `device_unbanned` events appear in Security Logs (Rule 38.9) after each action
- [ ] Registering 3 accounts from the same device within 24h triggers `registration_abuse` and, on the 3rd occurrence, a ban
- [ ] All tests pass with `npx tsc --noEmit`

---

## 12. CHANGE LOG

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-09-04 | Added `password_recovery_failed` (wrong Telegram OTP / wrong security-question answer) as a strike-eligible breach trigger, cross-referenced from the new `buyer_password_recovery_specification.md`.                                                                                                                                                                                                                                                                                                  |
| 2026-09-04 | Updated `password_recovery_failed` trigger description to reflect the revised 3-method recovery flow (email OTP added, security questions reduced to 1) per operational protocol Rule 48.                                                                                                                                                                                                                                                                                                              |
| 2026-09-04 | Initial specification created. Two-tier breach model (instant ban: SQL injection, location anomaly; 3-strike ban: brute-force login, wrong-role access, registration abuse, repeated rate-limit hits). Permanent ban until manual super-admin unban. Header-only Gatekeeper Fingerprint distinct from Rule 38.4's client-info fingerprint. `DeviceBan` model, `/superAdmin/gatekeeper` page, API endpoints, middleware integration. Applies to all account types plus pre-auth login/register traffic. |

---

**Document Version:** 1.2  
**Last Updated:** 2026-09-04  
**Status:** Specification Complete — not yet built (`middleware.ts` does not yet include this check; `DeviceBan` table does not yet exist)
