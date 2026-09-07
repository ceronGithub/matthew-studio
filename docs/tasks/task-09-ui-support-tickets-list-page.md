# Task 09 — Buyer support ticket list + new-ticket UI

**Fulfills:** buyer_account_specification.md Section 4.5 (Support Tickets)
**Phase:** PHASE 2 — BUYER ACCOUNT FEATURES
**Dependency:** task-08 [DONE]

> Back-filled 2026-09-07 per Rule 49.1 — code was built and Layer-3
> verified on 2026-09-06; this traceability file was never written at
> build time.

`/buyer/support` page (reads optional `?orderId=` ahead of Task 10's
wiring), `SupportTicketsList.tsx` (card grid + pagination, Rule 25
states), `NewSupportTicketForm.tsx` (client + server validation
parity, CSRF header, toast on success), `useBuyerSupportTickets.ts`,
`lib/ticketStatus.ts`. Added a "Support" quick-link to the buyer
dashboard.
