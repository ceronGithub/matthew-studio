# Buyer Order History & Tracking — Feature Specification Document

## 1. PURPOSE & OVERVIEW

Buyers currently have no page to view their past orders or track a t-shirt order's production progress — `app/buyer/` only ships a placeholder dashboard shell (`app/buyer/dashboard/page.tsx`). This document specifies the two pages that close that gap:

- `/buyer/orders` — Order History list
- `/buyer/orders/[orderId]` — Order Tracking detail

Both are **read-only** from the buyer's side — every write (status change, production stage advance) happens on the admin or super-admin side (admin spec Section 3.3.3, super-admin spec Section 3.11) against the same `Order` record. The buyer view exists to reflect that shared state, never to mutate it.

**Target User:** any authenticated buyer account, viewing only their own orders.

---

## 2. ACCESS & AUTHENTICATION

- **Route guard:** both pages sit under `app/buyer/`, already covered by `middleware.ts`'s buyer role check (Rule 31.11) — no separate guard needed.
- **Data scope:** every query is scoped to `WHERE userId = <​current buyer's id>` — a buyer must never be able to view another buyer's order by guessing an `orderId` in the URL. If the `orderId` exists but belongs to another buyer, return the same "not found" state as a nonexistent order (never a 403 that confirms the order exists).

---

## 3. PAGES

### 3.1 — Order History (`/buyer/orders`)

**Purpose:** Let the buyer see every order they've placed, most recent first.

**Content:**

- Paginated list (10 per page, newest first) — cards, not a dense admin-style table (Rule 17: buyer-facing UI stays product-studio quality, not an ops dashboard)
- Each card: order thumbnail (first item's product image), order ID (shortened, e.g. `#A1B2C3`), item count + first item name ("T-Shirt (Classic Fit) +2 more"), total, status badge, order date
- **Status badges** — same 5 top-level statuses as the admin spec (Pending / Confirmed / Shipped / Delivered / Cancelled), same color mapping for consistency
- **T-shirt orders additionally show a mini production-stage label** under the status badge (e.g. "Printing" or "Quality Check") when `productionStage` is set — digital-only orders never show this line
- Click anywhere on the card → `/buyer/orders/[orderId]`

**States (Rule 25):**
- Loading → skeleton cards (3 placeholder cards, pulse animation)
- Empty → "No orders yet." + a CTA button back to `/shop`
- Error → "We couldn't load your orders. Please try again." + retry button

---

### 3.2 — Order Tracking Detail (`/buyer/orders/[orderId]`)

**Purpose:** Full detail on one order, with a visual tracking timeline for the buyer to follow progress — this is the page a buyer checks after placing a t-shirt order to see "where is my shirt right now."

**Display Sections:**

1. **Order Header**
   - Order ID, date placed, current status badge

2. **Tracking Timeline (conditional on category)**
   - **Digital-only order:** simple 3-step timeline — Order Placed → Payment Confirmed → Delivered (near-instant in practice, but still shown for consistency and receipt purposes)
   - **T-shirt order:** full stepper mirroring the admin's 6-stage pipeline (admin spec Section 3.3.3) — Order Placed → Design Review → Design Approved → Printing → Quality Check → Packed → Shipped → Delivered. Completed steps are filled/checked, the current step is highlighted, future steps are muted.
   - Each completed step shows its timestamp (e.g. "Printing — completed Sep 3, 2:14 PM"). Admin's internal notes are NEVER shown here — only the buyer-safe milestone + timestamp. If an admin attached a proof photo at Quality Check or Packed (admin spec Section 3.3.3), that photo displays inline at that step.
   - **Reverted stages are never shown as a "step backward" to the buyer** — if an admin reverts printing → quality_check for a reprint, the buyer's timeline simply keeps showing "Printing" as current (no confusing forward-then-back animation, no exposure of internal rework reasons)

3. **Items in Order**
   - Product image, name, category, price, quantity, subtotal per item — same data as admin spec Section 3.3.2's items table, buyer-facing copy

4. **Payment Summary**
   - Subtotal, shipping (if applicable), total
   - Payment method + status (Paid / Pending / Failed) — never show raw payment gateway transaction IDs to the buyer (internal-only per admin spec Section 3.3.2)

5. **Shipping Info** (t-shirt orders only)
   - Delivery address on file
   - Courier + tracking number, once the admin has set it (Send Tracking Email trigger in admin spec Section 3.3.2 populates this field)

**Actions available to buyer:**

- **Contact Support** button — opens a pre-filled support message referencing this order ID
- **Cancel Order** button — only visible while `status = "Pending"` and `productionStage` is null or `design_review` (i.e., before printing has started); disabled with a tooltip explaining why once production has begun
- **Reorder** button — only on Delivered/Cancelled orders, pre-fills the cart with the same items

**States (Rule 25):** same loading/empty/error pattern as 3.1; "not found" state (see Section 2) reuses the same empty-state component with a "We couldn't find that order." message.

---

## 4. DATA MODEL (shared, no new table)

This page reads the same `Order` record admin and super-admin write to — no separate buyer-facing table. Relevant fields already defined by the admin spec:

- `status` — top-level order status (Pending/Confirmed/Shipped/Delivered/Cancelled)
- `productionStage` — nullable, only populated for `tshirts`-category orders (admin spec Section 3.3.3)
- `productionStageHistory` — timestamped log of stage transitions, used to render the timeline's completed-step timestamps (reverts are recorded here for the admin's audit trail per Section 3.3.3, but the buyer-facing query filters them out per Section 3.2 above)

---

## 5. API ENDPOINTS

### GET /api/buyer/orders

**Auth:** buyer session required.

**Query Params:** page, limit

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [...],
    "totalCount": 12,
    "totalPages": 2,
    "page": 1
  },
  "message": "Order history retrieved."
}
```

### GET /api/buyer/orders/[orderId]

**Auth:** buyer session required. Server-side check: `order.userId === session.userId`, else return the same 404 shape as a nonexistent order (Section 2).

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "status": "confirmed",
    "productionStage": "printing",
    "timeline": [...],
    "items": [...],
    "payment": { "method": "PayMongo", "status": "paid" },
    "shipping": { "courier": null, "trackingNumber": null }
  },
  "message": "Order detail retrieved."
}
```

### PUT /api/buyer/orders/[orderId]/cancel

**Auth:** buyer session required. Server-side check: same ownership check as above, AND `status === "pending"` AND (`productionStage` is null or `"design_review"`) — reject with a clear message otherwise, never a generic 400.

**Response:**

```json
{
  "success": true,
  "data": { "orderId": "uuid", "status": "cancelled" },
  "message": "Order cancelled successfully."
}
```

---

## 6. TOAST NOTIFICATIONS (Rule 22)

| Action | Type | Message |
|---|---|---|
| Cancel order | success | `✓ Order cancelled.` |
| Cancel order (blocked — production started) | error | `✕ This order can no longer be cancelled — production has already started.` |
| Reorder | success | `✓ Items added to your cart.` |

---

## 7. TESTING & VERIFICATION CHECKLIST

- [ ] Buyer sees only their own orders at `/buyer/orders`, never another buyer's
- [ ] Visiting `/buyer/orders/[orderId]` with another buyer's order ID shows "not found," not a 403
- [ ] Digital-only orders show the 3-step timeline; `tshirts`-category orders show the full 6-stage stepper
- [ ] A reverted production stage never displays as a step moving backward on the buyer's timeline
- [ ] Admin-internal notes and raw payment transaction IDs never appear on any buyer-facing page
- [ ] Cancel button is hidden/disabled once `productionStage` passes `design_review`
- [ ] Reorder button only appears on Delivered or Cancelled orders
- [ ] Empty state shows for a buyer with zero orders, with a working CTA back to `/shop`
- [ ] All tests pass with `npx tsc --noEmit`

---

## 8. CHANGE LOG

| Date       | Change                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-04 | Initial specification created — `/buyer/orders` list and `/buyer/orders/[orderId]` tracking detail, companion to admin spec Section 3.3.3's production-stage pipeline and super-admin spec Section 3.11's oversight update. Read-only shared `Order`/`productionStage` model, no new tables. |

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-04  
**Status:** Specification Complete — not yet built (`app/buyer/orders/` does not exist yet; only `app/buyer/dashboard/` placeholder exists)
