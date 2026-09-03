# Buyer Account — Feature Specification Document

## 1. PURPOSE & OVERVIEW

`app/buyer/` currently ships only a placeholder dashboard shell
(`app/buyer/dashboard/page.tsx`) with two live quick-links (Shop,
Tutorials) and two "coming soon" cards (Profile, Payment method). This
document specifies the remaining buyer-account surface area so a buyer
has a complete post-purchase experience — not just a marketing funnel
that stops at checkout.

This spec covers everything under "Buyer Dashboard" **except order
history/tracking**, which already has its own document
(`buyer_order_tracking_specification.md`, speced but not yet built).
Sections here are written to sit alongside that doc, not duplicate it.

**Target User:** any authenticated buyer account, own data only.

---

## 2. ACCESS & AUTHENTICATION

- All pages in this spec live under `app/buyer/`, already covered by
  `middleware.ts`'s buyer role check (Rule 31.11) — no new guard needed.
- Every query scoped to `WHERE userId = <​current buyer's id>` — same
  ownership rule as `buyer_order_tracking_specification.md` Section 2.
  A buyer must never reach another buyer's ticket, download, or
  payment method by guessing an ID in the URL.

---

## 3. CURRENT STATE (already built)

| Piece | File | Status |
|---|---|---|
| Buyer shell (nav + session greeting) | `app/buyer/layout.tsx`, `components/buyer/BuyerNav.tsx` | ✅ Built |
| Dashboard quick-links | `app/buyer/dashboard/page.tsx`, `QuickLinkGrid.tsx` | ✅ Built (Profile/Payment cards marked unavailable) |
| First-login welcome modal | `components/buyer/OnboardingModal.tsx` | ✅ Built |
| Order history + tracking | `/buyer/orders`, `/buyer/orders/[orderId]` | 📋 Speced only — see `buyer_order_tracking_specification.md` |

Everything in Section 4 below is **net-new — no spec, no code yet.**

---

## 4. PAGES (proposed, not yet built)

### 4.1 — Downloads & License Delivery (`/buyer/downloads`)

**Why this is priority #1 of the new pages:** buyers can already pay
for digital products (templates, file tools, AI video credits) but
there is currently no page anywhere that hands over what they bought.
This is the single biggest gap in the buyer experience.

**Content:**
- One card per purchased digital item: thumbnail, product name,
  category, purchase date, license/version if applicable
- **Download button** — for File Tools / one-time template purchases,
  streams the asset (or a signed Cloudflare R2 URL, Rule 35.6) directly
- **License key display** — for template Tier 2/3/4 one-time purchases,
  show the license key with a copy button; never re-issue a new key on
  re-download
- T-shirt orders and pure services (AI Video Maker jobs) don't appear
  here — those live in Order History instead (t-shirts) or in a
  dedicated "My AI Videos" list (out of scope, flag if needed)
- Re-download allowed unlimited times for owned items — never
  rate-limited the way public endpoints are (Rule 32.1); this is an
  authenticated, already-paid action

**States (Rule 25):** loading skeleton, empty ("No downloads yet." +
CTA to `/shop`), error with retry.

---

### 4.2 — Profile (`/buyer/profile`)

**Content:**
- Editable: full name, display name, phone, avatar
- Read-only: email (changing email is a separate, security-sensitive
  flow — out of scope here, flag if needed), account created date
- Form follows Rule 34.3 (autofocus first field, inline validation,
  disabled-submit-while-saving) and React Hook Form + Zod per Rule 31.7
- Saving updates `user_metadata` via `browserClient` (Rule 35.2) —
  never touches auth credentials from this page

**Toast:** `✓ Profile updated successfully.` (Rule 22.3 pattern, already
listed as a standard trigger)

---

### 4.3 — Payment Methods (`/buyer/payment-methods`)

**Content:**
- List of saved payment methods (masked card, e.g. "Visa •••• 4417")
- Add new method → redirects to PayMongo's hosted card-save flow
  (never collect raw card numbers on this app's own form — PCI scope
  reduction)
- Remove method — routed through the shared `ConfirmationModal`
  (Rule 34.4), since it's a destructive action
- Set default method for future checkouts

**Data:** this app never stores card numbers (Rule 6.6/never_store)
— only PayMongo's returned payment-method token/reference and the
masked display string.

---

### 4.4 — Subscription Management (`/buyer/subscription`)

**Why needed:** Template Tier 1 is a ₱15k/mo recurring plan (per
`matthew-studio` product pricing) — buyers on that tier currently have
no way to see billing status, change plan, or cancel.

**Content:**
- Current plan name, price, billing cycle, next billing date
- Status badge (Active / Past Due / Cancelled)
- **Upgrade/Downgrade** — link to `/pricing` with current plan
  pre-highlighted (full plan-change logic can be a follow-up phase)
- **Cancel subscription** — via `ConfirmationModal` (Rule 34.4);
  cancellation takes effect at the end of the current billing period,
  never immediately, and the UI states that plainly
- **Billing history** — list of past invoices with download links
  (PDF receipts, Rule 30's PayMongo payment capture fields feed this)

**States:** buyers with no active subscription (one-time-purchase only)
see an empty state directing them to `/pricing`, not an error.

---

### 4.5 — Support Tickets (`/buyer/support`)

**Distinct from the public `/support` contact form** — this is a
persistent, per-buyer thread tied to their account, not a one-off
email.

**Content:**
- Ticket list: subject, status (Open/Answered/Closed), last updated
- New ticket form: subject, message, optional order reference
  (pre-fillable from Order Detail's "Contact Support" button per
  `buyer_order_tracking_specification.md` Section 3.2)
- Ticket detail: threaded messages, buyer can reply while status is
  Open/Answered; read-only once Closed (with a "Reopen" button)

**Toast:** `✓ Message sent. We'll get back to you soon.` (already a
standard trigger per Rule 22.3)

---

### 4.6 — Notifications (`/buyer/notifications` + bell icon in `BuyerNav`)

**Content:**
- Order status changes, subscription billing events, support ticket
  replies, announcements (fed from the super-admin Announcements
  feature, `super_admin_account_specification.md` Section 3.9)
- Unread count badge on the bell icon in `BuyerNav`
- Mark-as-read on open; "Mark all as read" action
- Clicking a notification deep-links to the relevant page (order
  detail, ticket, etc.)

---

## 5. DATA MODEL (new tables/fields needed)

```prisma
model BuyerDownload {
  id          String   @id @default(cuid())
  userId      String
  productId   String
  licenseKey  String?
  r2Key       String?           // Cloudflare R2 object key, Rule 35.6
  purchasedAt DateTime @default(now())

  @@index([userId])
}

model Subscription {
  id                 String    @id @default(cuid())
  userId             String    @unique
  planName           String
  priceMonthly       Float
  status             String    // active | past_due | cancelled
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean   @default(false)
  createdAt          DateTime  @default(now())
}

model SupportTicket {
  id          String    @id @default(cuid())
  userId      String
  subject     String
  status      String    @default("open") // open | answered | closed
  orderId     String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
}

model SupportTicketMessage {
  id        String   @id @default(cuid())
  ticketId  String
  senderId  String            // buyer userId or admin/staff id
  senderRole String           // "buyer" | "admin"
  message   String
  createdAt DateTime @default(now())

  @@index([ticketId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String            // order_update | billing | ticket_reply | announcement
  title     String
  body      String
  linkHref  String?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([isRead])
}
```

Payment methods themselves are **not** stored as a table with card
data — only a PayMongo reference token, likely as a field on the
existing buyer/user record or a thin `SavedPaymentMethod { id, userId,
paymongoMethodId, maskedLabel, isDefault }` model. Confirm against
whatever the checkout flow already persists before adding a new table.

---

## 6. API ENDPOINTS (proposed)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/buyer/downloads` | List owned digital products + license keys |
| GET | `/api/buyer/downloads/[id]/file` | Signed download (R2) |
| GET/PUT | `/api/buyer/profile` | Read/update profile fields |
| GET/POST/DELETE | `/api/buyer/payment-methods` | List/add/remove saved methods |
| GET | `/api/buyer/subscription` | Current plan + billing history |
| PUT | `/api/buyer/subscription/cancel` | Cancel at period end |
| GET/POST | `/api/buyer/support-tickets` | List / create tickets |
| GET/POST | `/api/buyer/support-tickets/[id]` | Thread detail / reply |
| GET/PUT | `/api/buyer/notifications` | List / mark-read |

All follow the standard response shape (Rule 28) and `force-dynamic`
(Rule 20/31.3).

---

## 7. TOAST NOTIFICATIONS (Rule 22)

| Action | Type | Message |
|---|---|---|
| Profile updated | success | `✓ Profile updated successfully.` |
| Payment method added | success | `✓ Payment method added.` |
| Payment method removed | success | `✓ Payment method removed.` |
| Subscription cancelled | success | `✓ Subscription will end on {date}.` |
| Support ticket submitted | success | `✓ Message sent. We'll get back to you soon.` |
| Download failed | error | `✕ Download failed. Please try again.` |

---

## 8. TESTING & VERIFICATION CHECKLIST

- [ ] Buyer sees only their own downloads, tickets, notifications — never another buyer's
- [ ] License key is never re-generated on repeat download
- [ ] Card numbers never touch this app's own servers/forms (PayMongo hosted flow only)
- [ ] Subscription cancel takes effect at period end, not immediately, and UI says so
- [ ] Empty states render correctly for buyers with zero downloads / no subscription / zero tickets
- [ ] Notification bell unread count updates after mark-as-read
- [ ] All tests pass with `npx tsc --noEmit`

---

## 9. IMPLEMENTATION PRIORITY (recommended build order)

1. **Downloads / License Delivery** — biggest live gap; buyers are already paying with nothing to receive
2. **Order History + Tracking** — already fully speced (`buyer_order_tracking_specification.md`), quick win
3. **Profile** — small, UI slot already reserved
4. **Payment Methods** — pairs naturally with Profile
5. **Subscription Management** — needed before Tier 1 monthly plan goes live at scale
6. **Support Tickets + Notifications** — valuable but not a launch blocker

---

## 10. CHANGE LOG

| Date       | Change |
|---|---|
| 2026-09-03 | Initial specification created — Downloads/License, Profile, Payment Methods, Subscription Management, Support Tickets, and Notifications, per buyer-dashboard recommendation review. Companion to `buyer_order_tracking_specification.md`. Spec-only — no code built yet. |

---

**Document Version:** 1.0
**Last Updated:** 2026-09-03
**Status:** Specification Complete — not yet built (`app/buyer/dashboard/` placeholder is the only buyer-area code that exists)
