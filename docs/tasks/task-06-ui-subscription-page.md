# Task 06 — Buyer subscription page UI

**Fulfills:** buyer_account_specification.md Section 4.4 (Subscription Management)
**Phase:** PHASE 2 — BUYER ACCOUNT FEATURES
**Dependency:** task-05 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

`/buyer/subscription` page + `SubscriptionDetail.tsx` (plan card,
status badge, upgrade/downgrade link to `/pricing`, Cancel via the
shared `ConfirmationModal`, billing history list, Rule 25
loading/empty/error states) + `lib/hooks/useBuyerSubscription.ts`.
Added a "Manage subscription" quick-link to the buyer dashboard.
Closes buyer_account_specification.md Section 4.4 end to end
(Tasks 04-06).
