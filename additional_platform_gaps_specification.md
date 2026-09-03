# Additional Platform Gaps — Feature Specification Document

## 1. PURPOSE & OVERVIEW

A second-pass audit of the repo (beyond Cart/Checkout, Buyer Account,
and Sitewide Technical/SEO) surfaced seven more items with no existing
spec and no existing code. None of these are launch-blockers the way
Cart/Checkout is, but two (Transactional Emails, Shop Filtering) become
relevant fast once checkout goes live. Bundled into one document since
they're unrelated to each other but each too small to warrant its own
file, matching the approach already used in
`sitewide_technical_seo_specification.md`.

Covers:
- 4.1 Coupon / Discount / Promo Codes
- 4.2 Refund Request & Processing
- 4.3 Social / OAuth Login (Google)
- 4.4 Two-Factor Authentication for Buyers
- 4.5 Transactional Email Templates (EmailJS wiring, Rule 35.5)
- 4.6 Shop Catalog Filtering & Sorting
- 4.7 Developer Environment Setup (`.env.example` + testing baseline)

---

## 2. ACCESS & AUTHENTICATION

- 4.1–4.2 involve buyer-facing UI (checkout for coupons, `/buyer/orders`
  for refund requests) plus an admin-side approval step (refunds only).
- 4.3–4.4 extend the existing login/registration flow — no new route
  guard, just new methods on top of it.
- 4.5 is server-side only, triggered by existing events (order placed,
  account created) — no user-facing route.
- 4.6 is public, no auth.
- 4.7 is dev-tooling, not part of the running app at all.

---

## 3. CURRENT STATE (verified against repo)

| Item | Found? |
|---|---|
| Coupon/discount/promo code (any form) | ❌ Not found |
| Refund request flow (beyond the static `/refund-policy` page) | ❌ Not found |
| Social/OAuth login button or handler | ❌ Not found |
| 2FA/MFA for buyer accounts | ❌ Not found (only planned for super-admin per its own spec) |
| EmailJS service file / templates | ❌ Not found, despite Rule 35.5 being the project's standard |
| Shop page filter/sort state | ❌ Not found — `/shop` is a 23-line category showcase, not a filterable product grid |
| `.env.example` | ❌ Not found |
| Test config (Jest/Playwright/etc.) | ❌ Not found — zero automated tests in the repo |

---

## 4. FEATURES (proposed, not yet built)

### 4.1 — Coupon / Discount / Promo Codes

**Content:**
- Input field at checkout (Section: `cart_checkout_specification.md`
  4.2 Step 3, Order Summary) — "Have a promo code?" expandable field
- Validates server-side only (never trust a client-side "valid"
  discount amount) — checks: code exists, not expired, not
  over-redeemed (usage limit), applies to items in cart if scoped to a
  category/product
- Discount types: percentage off, fixed amount off, free shipping
  (t-shirt orders only)
- Applied discount recalculates the `Order.total` server-side before
  the PayMongo Payment Link is created (Section 4.3 of
  `cart_checkout_specification.md`) — never applied after payment

**Admin side:** coupon creation/management belongs in the
super-admin spec (flag as an addition to
`super_admin_account_specification.md`'s CMS/product-management
section, not duplicated here).

---

### 4.2 — Refund Request & Processing

**Content:**
- **Buyer side:** "Request Refund" button on `/buyer/orders/[orderId]`
  (extends `buyer_order_tracking_specification.md` Section 3.2's
  action list) — only visible on Delivered/Cancelled orders within a
  policy window (e.g. 7 days, matches `/refund-policy` copy). Form:
  reason dropdown + optional note.
- **Admin/super-admin side:** refund requests queue, approve/deny with
  a note; approving triggers a PayMongo refund API call and updates
  `Order.status` to `"Refunded"`. This half belongs in the admin/
  super-admin spec as an addition — flagged here, not duplicated.
- **Toast:** `✓ Refund request submitted. We'll review it within 2-3 business days.`

---

### 4.3 — Social / OAuth Login (Google)

**Content:**
- "Continue with Google" button on login/registration, using
  Supabase Auth's built-in OAuth provider support
  (`browserClient.auth.signInWithOAuth({ provider: 'google' })`) — no
  custom OAuth handling needed, Supabase manages the token exchange.
- First-time OAuth sign-in auto-creates a buyer account (same
  `OnboardingModal` trigger as email/password registration).
- Account linking: if the OAuth email matches an existing
  email/password account, prompt to link rather than creating a
  duplicate account.

---

### 4.4 — Two-Factor Authentication for Buyers

**Content:**
- Opt-in only (unlike super-admin's mandatory 2FA) — toggle in
  `/buyer/profile` (extends `buyer_account_specification.md` Section
  4.2).
- TOTP-based (authenticator app), same pattern the super-admin spec
  already defines for its own 2FA — reuse that implementation rather
  than building a second one.
- Recovery codes generated on enable, shown once, buyer must
  acknowledge saving them before the toggle activates.

---

### 4.5 — Transactional Email Templates (Rule 35.5)

**Templates needed (each is one EmailJS template, per Rule 35.5's
"one template per email type" rule):**

| Template name | Trigger |
|---|---|
| `order_confirmation` | Order webhook confirms payment (Section 4.3, `cart_checkout_specification.md`) |
| `registration_welcome` | New account created (email/password or OAuth) |
| `password_reset` | Already speced in `buyer_password_recovery_specification.md` — confirm this template is wired there |
| `refund_confirmation` | Refund approved (Section 4.2 above) |
| `subscription_receipt` | Recurring billing charge succeeds (`buyer_account_specification.md` Section 4.4) |

**Implementation:** `services/emailjs.ts` per the exact pattern already
defined in Rule 35.5 — `sendEmail(templateId, templateParams)` helper,
never call `emailjs.send()` directly from a route.

---

### 4.6 — Shop Catalog Filtering & Sorting

**Content:**
- Category filter (the 6 product categories), price range, sort
  (Newest / Price low-high / Price high-low / Popular)
- URL-synced filters (`?category=templates&sort=price-asc`) so
  filtered views are shareable/bookmarkable
- Applies within each category's own listing page, not just the
  `/shop` showcase — confirm exact scope against how each category
  page (`/templates`, `/tshirts`, etc.) currently renders its list
  before implementing, since some may already have partial sorting
  logic worth reusing rather than replacing

---

### 4.7 — Developer Environment Setup

**`.env.example`** at project root — every key from every service spec
in this repo (Supabase, PayMongo, EmailJS, Cloudflare R2, Google
Drive, MaxMind GeoIP path) listed with blank/placeholder values and a
one-line comment per key explaining what it's for. Never real values.

**Testing baseline** — not full coverage, just the scaffold:
- `npm install --save-dev vitest @testing-library/react` (or
  Playwright if end-to-end is preferred — flag which one you want)
- One smoke test per critical path once built: cart add/remove,
  checkout total calculation, webhook signature rejection
- Wired into a simple `npm run test` script; CI hookup (GitHub
  Actions) can follow once tests exist

---

## 5. DATA MODEL

```prisma
model Coupon {
  id            String   @id @default(cuid())
  code          String   @unique
  discountType  String            // percentage | fixed | free_shipping
  discountValue Float
  usageLimit    Int?
  usageCount    Int      @default(0)
  expiresAt     DateTime?
  scopeCategory String?           // null = applies to all categories
  createdAt     DateTime @default(now())
}

model RefundRequest {
  id          String    @id @default(cuid())
  orderId     String
  userId      String
  reason      String
  note        String?
  status      String    @default("pending") // pending | approved | denied
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime  @default(now())

  @@index([orderId])
  @@index([userId])
}
```

Buyer 2FA reuses whatever `TwoFactorSecret`/recovery-code model the
super-admin spec already defines — do not create a second, parallel
2FA table.

---

## 6. API ENDPOINTS (proposed)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/checkout/validate-coupon` | Server-side coupon validation, returns discount amount |
| POST | `/api/buyer/orders/[orderId]/refund-request` | Buyer submits a refund request |
| GET | `/api/auth/oauth/google` | Handled by Supabase Auth directly — no custom route needed beyond the redirect config |
| POST/DELETE | `/api/buyer/2fa` | Enable/disable buyer 2FA |

---

## 7. TOAST NOTIFICATIONS (Rule 22)

| Action | Type | Message |
|---|---|---|
| Coupon applied | success | `✓ Promo code applied — ₱{amount} off.` |
| Coupon invalid/expired | error | `✕ This promo code isn't valid or has expired.` |
| Refund requested | success | `✓ Refund request submitted. We'll review it within 2-3 business days.` |
| 2FA enabled | success | `✓ Two-factor authentication enabled.` |

---

## 8. TESTING & VERIFICATION CHECKLIST

- [ ] Coupon discount always recalculated server-side, never trusts a client-submitted discount amount
- [ ] Expired or over-redeemed coupons are rejected with a clear message, not a silent no-op
- [ ] Refund request only appears on eligible orders (Delivered/Cancelled, within the policy window)
- [ ] OAuth sign-in with an email matching an existing account prompts to link, never silently creates a duplicate
- [ ] Buyer 2FA recovery codes shown exactly once, never retrievable again after the enable screen closes
- [ ] Every transactional email template fires from the correct trigger point, never sent twice for one event
- [ ] Shop filters are URL-synced and produce a correct, shareable link
- [ ] `.env.example` covers every key referenced across all specs in this repo
- [ ] All tests pass with `npx tsc --noEmit`

---

## 9. IMPLEMENTATION PRIORITY

None of these block launch the way Cart/Checkout does. Suggested order
once Cart/Checkout is live:

1. **Transactional emails (4.5)** — needed the moment checkout goes live (order confirmation)
2. **`.env.example` (4.7)** — cheap, unblocks onboarding any other dev/agent working on this repo
3. **Shop filtering (4.6)** — meaningful UX/conversion impact
4. **Coupons (4.1)** — only if a promo/marketing push is planned
5. **Refund processing (4.2)** — needed once real order volume starts
6. **OAuth login (4.3)** — nice-to-have conversion boost, not urgent
7. **Buyer 2FA (4.4)** — lowest urgency, opt-in security feature
8. **Testing baseline (4.7)** — ongoing, start whenever bandwidth allows

---

## 10. CHANGE LOG

| Date       | Change |
|---|---|
| 2026-09-03 | Initial specification created — Coupons, Refund Processing, OAuth Login, Buyer 2FA, Transactional Emails, Shop Filtering/Sorting, and Dev Environment Setup. Second-pass gap audit beyond Cart/Checkout, Buyer Account, and Sitewide Technical/SEO specs. Spec-only — no code built yet. |

---

**Document Version:** 1.0
**Last Updated:** 2026-09-03
**Status:** Specification Complete — not yet built (none of Sections 4.1–4.7 exist in the repo)
