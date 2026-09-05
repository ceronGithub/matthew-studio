# Task 16 — Admin reply + status mutation routes

Per admin_support_ticket_specification.md Sections 2-4.

- `POST /api/admin/support/tickets/[ticketId]/reply` — CSRF-checked,
  `getSessionAdmin()`-guarded. Creates a `TicketMessage`
  (`senderRole: "admin"`) and sets `SupportTicket.status` to
  `"answered"` in one `$transaction` (same atomic pattern as the
  buyer-side reply route). Calls `lib/notifications.ts`'s
  `createNotification()` with `type: "ticket_reply"`,
  `linkHref: /buyer/support/[ticketId]`. This is the call already
  drafted in that file's "NOT YET WIRED" header comment — remove that
  comment block once this lands.
- `PUT /api/admin/support/tickets/[ticketId]/status` — CSRF-checked,
  `getSessionAdmin()`-guarded, accepts `{ status: "closed" }` only for
  now (per spec Section 2, no other manual transitions defined yet).

Independently completable: builds on Task 15's auth helper and read
routes, but adds only the two mutation endpoints. Does not touch UI
(Task 17/18).
