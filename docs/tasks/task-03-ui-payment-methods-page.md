# Task 03 — /buyer/payment-methods Page (UI)

Parent: Phase 2, Item 3 (buyer_account_specification.md), Section 4.3 Payment Methods
Depends on: Task 02 (API routes)

## Scope
- `app/buyer/payment-methods/page.tsx` — Server Component, fetches
  list
- `components/buyer/PaymentMethodsList.tsx` — Client Component:
  - Masked card rows ("Visa •••• 4417"), default badge
  - "Add Payment Method" → triggers vaulting hold flow (Task 02 POST)
  - "Remove" → shared `ConfirmationModal` (Rule 34.4)
  - "Set Default" action
  - Loading skeleton / empty state / error state (Rule 25)
  - Toasts: `✓ Payment method added.` / `✓ Payment method removed.`
    (Rule 22.3, already-standard messages)

## Out of scope
- API/service logic → Tasks 01–02
