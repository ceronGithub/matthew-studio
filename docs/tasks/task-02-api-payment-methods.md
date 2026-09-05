# Task 02 — Buyer Payment Methods API Routes

Parent: Phase 2, Item 3 (buyer_account_specification.md), Section 4.3 Payment Methods
Depends on: Task 01 (vault service)

## Scope
- `app/api/buyer/payment-methods/route.ts`
  - GET → list SavedPaymentMethod rows for the buyer
  - POST → start vaulting hold, on success writes SavedPaymentMethod
    (maskedLabel, paymongoPaymentMethodId), voids the hold
- `app/api/buyer/payment-methods/[id]/route.ts`
  - DELETE → detachPaymentMethod() + remove SavedPaymentMethod row
- `app/api/buyer/payment-methods/[id]/default/route.ts`
  - PUT → set isDefault true on target, false on all other rows for
    that buyer (single transaction)

All routes: `export const dynamic = "force-dynamic"`, Rule 28 response
shape, ownership check (buyer can only touch their own rows), Rule 6
duplicate/ownership checks.

## Out of scope
- Vault service internals → Task 01
- UI → Task 03
