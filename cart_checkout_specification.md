# Cart, Checkout & Payment — Feature Specification Document

## 1. PURPOSE & OVERVIEW

No cart, checkout, or payment integration exists anywhere in the repo
today — confirmed by direct search (no `cart`, `checkout`, `purchase`,
or `paymongo` files). Every other buyer-facing spec written so far
(`buyer_order_tracking_specification.md`, `buyer_account_specification.md`)
assumes an `Order` record already exists with a paid/pending status —
this document specifies how that `Order` actually gets created in the
first place. **Nothing downstream of this can go live without it.**

Covers:
- 4.1 Cart (add/remove/update, persisted per session)
- 4.2 Checkout (shipping vs digital-only paths)
- 4.3 PayMongo Integration (payment link + webhook, per Rule 30)
- 4.4 Order Creation (feeds the existing `Order` model)

**Target User:** any visitor (guest checkout allowed) or authenticated buyer.

---

## 2. ACCESS & AUTHENTICATION

- **Cart** is accessible to everyone — guests and buyers. Guest carts
  persist in a signed cookie (not `localStorage` — Rule 18.4); buyer
  carts persist server-side keyed to `userId` and merge into the cookie
  cart on login.
- **Checkout** requires at minimum an email — guest checkout is
  allowed for digital-only orders (Rule: never force account creation
  before a purchase, it kills conversion). T-shirt orders (physical
  shipping) also allow guest checkout but require shipping details.
  A guest can optionally create an account at the confirmation step to
  claim the order into their buyer dashboard.
- **PayMongo webhook** (`/api/paymongo/webhook`) has no user session —
  authenticated only by PayMongo's signature header, never by cookie.

---

## 3. CURRENT STATE (verified against repo)

| Item | Found? |
|---|---|
| Cart (any form — context, page, component) | ❌ Not found |
| Checkout page/route | ❌ Not found |
| PayMongo SDK/service file | ❌ Not found |
| `/api/paymongo/webhook` | ❌ Not found |
| `Order` Prisma model | ⚠️ Referenced by `buyer_order_tracking_specification.md` as already existing/shared — confirm exact schema in `prisma/schema.prisma` before building; if it doesn't exist yet either, it gets created here (Section 5) |

---

## 4. FEATURES (proposed, not yet built)

### 4.1 — Cart

**Content:**
- Slide-in drawer (not a full page) accessible from a cart icon in the
  main nav, badge shows item count
- Line items: thumbnail, product name, variant (e.g. template design
  variant: Static/Dynamic/Modern; t-shirt size/color), unit price,
  quantity stepper, remove button
- Subtotal, "Proceed to Checkout" button
- Empty state: "Your cart is empty." + CTA to `/shop`
- Mixed-category carts allowed (e.g. one template + one t-shirt in the
  same cart) — checkout splits shipping logic per item category
  internally, buyer never sees two separate checkouts

**Persistence:**
- Guest: signed, HttpOnly-adjacent cookie (readable by client for cart
  count display, but cart *contents* re-validated server-side at
  checkout so prices can't be tampered with client-side)
- Buyer: `CartItem` rows keyed to `userId`, synced on every add/remove
- On login, guest cookie cart merges into the buyer's server cart
  (dedupe by productId+variant, sum quantities)

---

### 4.2 — Checkout

**Flow:**
1. **Contact info** — email (pre-filled if logged in); "Create an
   account" checkbox for guests (optional, never forced)
2. **Shipping** (only shown if cart contains a physical item, i.e.
   t-shirts) — name, address, phone; skipped entirely for digital-only
   carts
3. **Order summary** — line items, subtotal, shipping fee (physical
   only), total — recalculated server-side, never trust client totals
4. **Pay with PayMongo** button → redirects to PayMongo's hosted
   checkout (Section 4.3) — this app never collects raw card numbers
   itself (Rule 6.6 / PCI scope reduction, same principle as
   `buyer_account_specification.md` Section 4.3's saved-payment-method
   flow)
5. **Confirmation page** (`/order-confirmation/[orderId]`) — shown
   after PayMongo redirects back; shows a "Payment processing..."
   state until the webhook (Section 4.3) confirms, then flips to
   "Order confirmed" with a link to track it (`/buyer/orders/[orderId]`
   if logged in, or a magic-link/email receipt if guest)

**States (Rule 25):** cart validation errors (e.g. an item went out of
stock between add-to-cart and checkout) shown inline per line item,
never a generic failure — the buyer can remove the bad item and
continue with the rest.

---

### 4.3 — PayMongo Integration (Rule 30 compliance)

**`services/paymongo.ts`**
- Creates a PayMongo Payment Link (or Checkout Session, whichever
  PayMongo product fits) server-side with the server-validated total —
  never the client-submitted total.
- Never exposes the PayMongo secret key to the client (server-only env
  var, no `NEXT_PUBLIC_` prefix — Rule 18.5).

**`/api/paymongo/webhook/route.ts`**
- Verifies PayMongo's webhook signature before processing anything.
- Extracts `paymentId`, `paymentStatus`, `paidAt` per Rule 30.2's
  exact extraction pattern.
- Updates the matching `Order` row: `status: "PAID"`,
  `paymongoPaymentId`, `paymentStatus`, `paidAt` — this is the
  **single source of truth** for payment confirmation. No other route
  re-queries PayMongo to check payment status (Rule 30.3) except the
  Retry Payment flow for a stuck PENDING order.
- Rate-limited is not applicable here (webhook, not user-facing), but
  the signature check IS the security boundary — reject anything that
  fails it with a 401, log via `logSecurityEvent` (Rule 38) as a
  suspicious event if signature verification fails repeatedly from the
  same source.

---

### 4.4 — Order Creation

- On successful checkout submission (before redirecting to PayMongo),
  create the `Order` row with `status: "pending"` and a
  `paymongoOrderId` (the Payment Link ID) — this is what the webhook
  later finds and updates to `"PAID"`.
- Order items snapshot the product name/price/variant at time of
  purchase (never a live join to the product table — so a later price
  change never retroactively alters a past order's total).
- This is the exact `Order` record `buyer_order_tracking_specification.md`
  already reads from — no schema conflict, this spec is what
  populates it.

---

## 5. DATA MODEL

```prisma
model CartItem {
  id         String   @id @default(cuid())
  userId     String?           // null for guest carts (cookie-keyed instead)
  cartToken  String?           // guest cart identifier, null for buyer carts
  productId  String
  variant    String?           // e.g. design variant, size/color
  quantity   Int      @default(1)
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([cartToken])
}

model Order {
  id                 String   @id @default(cuid())
  userId             String?           // null if guest checkout, claimable later
  guestEmail         String?
  status             String   @default("pending") // pending | PAID | Confirmed | Shipped | Delivered | Cancelled
  subtotal           Float
  shippingFee        Float    @default(0)
  total              Float
  paymongoOrderId    String?           // Payment Link ID
  paymongoPaymentId  String?           // set by webhook, Rule 30.1
  paymentStatus      String?           // set by webhook, Rule 30.1
  paidAt             DateTime?         // set by webhook, Rule 30.1
  productionStage    String?           // t-shirt orders only, per buyer_order_tracking_specification.md
  createdAt          DateTime @default(now())

  items OrderItem[]
}

model OrderItem {
  id         String  @id @default(cuid())
  orderId    String
  productId  String
  nameSnapshot  String
  priceSnapshot Float
  variant    String?
  quantity   Int

  order Order @relation(fields: [orderId], references: [id])
  @@index([orderId])
}
```

> Confirm against `prisma/schema.prisma` before implementing — if an
> `Order` model already exists with different field names, reconcile
> rather than create a duplicate/conflicting model.

---

## 6. API ENDPOINTS (proposed)

| Method | Route | Purpose |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/cart` | Read/add/update-qty/remove cart items (guest or buyer, resolved by cookie or session) |
| POST | `/api/checkout` | Validates cart server-side, creates `Order` (pending) + `OrderItem`s, creates PayMongo Payment Link, returns redirect URL |
| POST | `/api/paymongo/webhook` | PayMongo signature-verified callback, updates `Order` to PAID per Rule 30.2 |
| GET | `/api/orders/[orderId]/status` | Polled by the confirmation page while awaiting webhook (Rule 30.4 pattern — reads DB only, never re-queries PayMongo) |

All follow the standard response shape (Rule 28) and `force-dynamic`
(Rule 20/31.3).

---

## 7. TOAST NOTIFICATIONS (Rule 22)

| Action | Type | Message |
|---|---|---|
| Add to cart | success | `✓ "{productName}" added to cart.` |
| Remove from cart | success | `✓ Item removed from cart.` |
| Cart item out of stock at checkout | warning | `⚠ "{productName}" is no longer available and was removed from your cart.` |
| Checkout submit failed | error | `✕ We couldn't process your order. Please try again.` |
| Payment confirmed | success | `✓ Payment received! Your order is confirmed.` |

---

## 8. TESTING & VERIFICATION CHECKLIST

- [ ] Cart total always recalculated server-side at checkout — client-submitted totals never trusted
- [ ] Guest cart persists across a page refresh (signed cookie) and merges correctly into the buyer cart on login
- [ ] Mixed digital + physical cart correctly skips the shipping step's fee for digital-only lines
- [ ] Webhook rejects requests with an invalid/missing PayMongo signature (401, logged as a security event)
- [ ] `Order.status` only becomes `"PAID"` via the webhook — never set directly by the checkout submit route
- [ ] Retry Payment flow is the only route allowed to re-query PayMongo directly (Rule 30.3 exception)
- [ ] Order confirmation page correctly shows "processing" then flips to "confirmed" without a manual refresh (poll `/api/orders/[orderId]/status`)
- [ ] All tests pass with `npx tsc --noEmit`

---

## 9. IMPLEMENTATION PRIORITY

This entire spec is priority #1 above everything previously discussed
(buyer downloads, subscriptions, etc.) — those all depend on `Order`
rows existing, which only this flow produces. Suggested internal order:

1. `Order` / `OrderItem` schema (confirm or create)
2. Cart (drawer + `CartItem` API)
3. Checkout page + server-side validation
4. PayMongo Payment Link creation
5. Webhook + Order status update (Rule 30)
6. Order confirmation page + status polling

---

## 10. CHANGE LOG

| Date       | Change |
|---|---|
| 2026-09-03 | Initial specification created — Cart, Checkout, PayMongo integration (Payment Link + webhook per Rule 30), and Order creation. Verified as completely missing from the repo — no cart/checkout/paymongo files found anywhere. This is the foundation every other buyer-facing spec (order tracking, buyer account) depends on. Spec-only — no code built yet. |

---

**Document Version:** 1.0
**Last Updated:** 2026-09-03
**Status:** Specification Complete — not yet built (zero cart/checkout/payment code exists in the repo)
