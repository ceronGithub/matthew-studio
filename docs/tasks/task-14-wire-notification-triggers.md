# Task 14 — Wire notification creation into existing events

Create a Notification row (via a shared helper, e.g.
lib/notifications.ts createNotification()) from:
- app/api/paymongo/webhook/route.ts — on order status change (Order
  paid/shipped/delivered/failed) -> type: order_update
- Subscription billing events (subscription cancel route, and the
  billing-history-producing webhook if one exists) -> type: billing
- app/api/buyer/support/[ticketId]/reply/route.ts — when senderRole
  is "admin" (buyer should be notified of admin replies, not their
  own) -> type: ticket_reply

Independently completable: touches 3 existing route files, adds one
new shared helper. Does not touch schema/API/UI from Tasks 11-13.
