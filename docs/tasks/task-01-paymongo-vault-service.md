# Task 01 — PayMongo Vault Service (services/paymongo.ts extension)

Parent: Phase 2, Item 3 (buyer_account_specification.md), Section 4.3 Payment Methods
Depends on: BuyerPaymentProfile + SavedPaymentMethod models (DONE, schema.prisma)

## Scope
Extend `services/paymongo.ts` only — no API routes, no UI in this task.

- `getOrCreatePaymongoCustomer(userId)` — creates/fetches a PayMongo
  Customer, persists `BuyerPaymentProfile.paymongoCustomerId`
- `createVaultingHold(customerId)` — authorize-then-void Payment
  Intent with `setup_future_usage` attached (per spec's confirmed
  "Hold then capture" design)
- `voidHold(paymentIntentId)` — voids the authorization after the
  card is vaulted
- `listPaymongoPaymentMethods(customerId)` — fetch vaulted methods
  from PayMongo for reconciliation
- `detachPaymentMethod(paymentMethodId)` — remove from PayMongo side

## Out of scope (separate tasks)
- API routes → Task 02
- UI → Task 03
