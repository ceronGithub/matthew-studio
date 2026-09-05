# Task 17 — Admin ticket inbox UI

Per admin_support_ticket_specification.md Sections 2, 5.

- New `lib/hooks/useAdminSupportTickets.ts` — list + status filter,
  same three-state pattern (loading/empty/error, Rule 25) as
  `useBuyerSupportTickets.ts`.
- `app/admin/support/page.tsx` (Server Component shell) +
  `AdminSupportTicketsList.tsx` (client) — table/list of tickets:
  subject, buyer email, status badge, last-updated, status filter
  tabs. Links each row to `/admin/support/[ticketId]`.
- New `app/styles/adminSupport.css`.
- Update `app/admin/dashboard/page.tsx`'s `PLANNED_SECTIONS` —
  replace the "Support ticket handling" placeholder bullet (if not
  literally worded that way, the closest existing bullet) with a real
  link to `/admin/support`.

Independently completable: consumes Task 15's GET list route only.
Does not touch the detail/reply page (Task 18).
