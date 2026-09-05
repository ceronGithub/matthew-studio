# Task 18 — Admin ticket detail, reply, and close UI

Per admin_support_ticket_specification.md Sections 2, 5.

- New `lib/hooks/useAdminSupportTicketDetail.ts` — fetch thread,
  submit reply, submit status change; same shape as
  `useBuyerSupportTicketDetail.ts`.
- `app/admin/support/[ticketId]/page.tsx` (Server Component shell) +
  `AdminSupportTicketDetail.tsx` (client) — full thread (buyer/admin
  messages visually distinguished, reusing the buyer-side thread
  styling), reply textarea + submit, "Close ticket" button gated by
  the existing shared `ConfirmationModal` (Rule 34.4).
- Toasts (Rule 22) on reply sent / ticket closed / errors.

Independently completable: consumes Task 15's GET detail route and
Task 16's POST reply / PUT status routes. Completes the feature end
to end.
