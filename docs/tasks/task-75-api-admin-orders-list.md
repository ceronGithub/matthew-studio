# task-75 — Admin Orders List API

**Spec:** admin_account_specification.md Section 3.3.1
**Phase:** 3 (remainder) — item 4, task-72 order-management split
**Depends on:** task-74 (schema — statusHistory/internalNotes/refundReason/refundedAt)
**Status:** DONE — built 2026-09-07

## What was built
`GET /api/admin/orders/route.ts`
- Auth: `getSessionAdmin()`, 401 if not admin/superAdmin.
- Filters: `status` (validated against the 5 known statuses),
  `dateFrom`/`dateTo` on `createdAt`, `search` (order ID substring OR
  guest email, case-insensitive).
- Pagination: 25/page, standard `{ orders, totalCount, totalPages, page }` shape.
- CSV export: `?format=csv` returns `text/csv` with a
  `Content-Disposition: attachment` header, capped at 5000 rows,
  filename `orders-export-<date>.csv`.
- Buyer email resolution: `guestEmail` on the row for guest checkouts;
  registered buyers (`userId` set) resolved via a deduplicated
  `supabaseAdminClient.auth.admin.getUserById()` batch, same pattern
  as `app/api/admin/support/tickets/route.ts`.

## Known gap (documented in the route's own comments)
Search cannot match a registered buyer's email server-side — that
would require scanning every Supabase Auth user. Search is limited to
order ID and guest email. Flag for developer review if buyer-email
search becomes a real ops need; likely solution is a denormalized
`buyerEmailSnapshot` column on `Order`, set at checkout time.

## Verification
1. `npx prisma db push && npx prisma generate` if not already run for task-74's fields.
2. `GET /api/admin/orders` as a logged-in admin → 200, paginated list.
3. `GET /api/admin/orders?status=Shipped` → only Shipped orders.
4. `GET /api/admin/orders?format=csv` → downloads a CSV file.
5. `GET /api/admin/orders` while logged out / as a buyer → 401.
