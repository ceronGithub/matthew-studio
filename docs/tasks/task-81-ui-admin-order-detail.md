# task-81 — Admin Order Detail Page (UI)

**Spec section:** admin_account_specification.md Section 3.3.2 (Order Details page)
**Phase:** PHASE 3 — Admin & Oversight (overviewProject.txt Section 5C), item 4's task-72 split
**Depends on:** task-76 (order detail API), task-77 (status/refund/note actions), task-78 (send-email API) — all DONE
**Status:** DONE — built 2026-09-07

## What was built
- `lib/hooks/useAdminOrderDetail.ts` — fetch order detail (loading/
  notFound/error states per Rule 25), plus updateStatus/refund/
  addNote/sendBuyerEmail actions. Merges each action's own response
  into local state instead of refetching the whole order.
- `components/admin/AdminOrderDetail.tsx` — header (order id, status
  badge, back link), buyer/payment/shipping info cards, items table +
  order summary, status timeline, internal notes list + add-note
  form, email-buyer panel (preset/subject/body), and the update-status
  + refund forms. Update Status and Refund both go through the shared
  `ConfirmationModal` (Rule 34.4) — same precedent as task-80's bulk
  status change, since both notify the buyer and/or move money. Add
  Note and Send Email submit directly (non-destructive, Rule 34.3).
- `app/admin/orders/[orderId]/page.tsx` — Server Component page shell
  (Rule 31.1), same split as task-80's list page.
- `app/styles/adminOrderDetail.css` — page/card/timeline/action styles,
  design tokens only (Rule 33), plus a local copy of the shared
  ConfirmationModal's `.confirmationModal*` classes — same per-page
  duplication pattern already used by buyerOrderDetail.css /
  buyerPaymentMethods.css / buyerSubscription.css. (Note: task-80's
  own adminOrders.css does NOT carry these classes even though
  AdminOrdersList.tsx uses ConfirmationModal for its bulk-update flow
  — pre-existing gap in that file, out of scope for this task.)

## Scope notes
- T-shirt orders (`hasTshirtItem`) show `productionStage` as a
  read-only label via `PRODUCTION_STAGE_LABELS` (`lib/orderStatus.ts`)
  only — the interactive advance/revert stepper is task-82, a
  separate micro-task per Rule 49 Step 4, meant to embed into this
  same page later.
- `npx tsc --noEmit` shows zero errors in the 4 new files. 38
  pre-existing errors elsewhere in the repo (including task-76's own
  API route) are all "implicitly has an 'any' type" / missing
  `Product` fields on Prisma model types — caused by `@prisma/client`
  not being generated in this sandbox (`npx prisma generate` can't
  reach `binaries.prisma.sh`, outside the allowed network domains
  here). Run `npx prisma generate && npx tsc --noEmit` in a real dev
  environment to confirm a clean baseline before merging.
