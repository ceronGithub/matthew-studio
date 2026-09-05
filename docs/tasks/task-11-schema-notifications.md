# Task 11 — Notification schema

Add `Notification` model per buyer_account_specification.md Section 5:
- id, userId, type (order_update | billing | ticket_reply | announcement),
  title, body, linkHref, isRead, createdAt
- Indexes on userId and isRead (unread-count query)

Scope note: `announcement` type included in the enum for forward
compatibility, but nothing creates that type yet — the super-admin
Announcements feature (super_admin_account_specification.md Section
3.9) doesn't exist in this repo yet. No-op until that lands.

Independently completable: schema + `npx prisma db push` + `generate`.
