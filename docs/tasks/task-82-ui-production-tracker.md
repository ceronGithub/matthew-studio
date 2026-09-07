# task-82 — T-Shirt Production Tracker (UI)

**Spec section:** admin_account_specification.md Section 3.3.3 (T-Shirt Production Tracking)
**Phase:** PHASE 3 — Admin & Oversight (overviewProject.txt Section 5C), item 4's task-72 split (final piece)
**Depends on:** task-79 (production-stage API), task-81 (order detail page it embeds into) — both DONE
**Status:** DONE — built 2026-09-07

## What was built
- `components/admin/ProductionStageTracker.tsx` — horizontal 6-stage
  stepper (design_review → design_approved → printing →
  quality_check → packed → shipped), reusing `PRODUCTION_STAGE_LABELS`
  from `lib/orderStatus.ts` (single source of truth, shared with the
  buyer tracking page). Direction (advance vs revert) is computed
  client-side purely to decide the UI gate — the server independently
  recomputes it from the DB's actual current stage (task-79 already
  does this per Rule 6), so this component's guess can't bypass that
  check. Reverting requires a note and goes behind the shared
  `ConfirmationModal` (Rule 34.4); advancing submits directly. A proof
  photo can be attached only when the target stage is Quality Check or
  Packed, matching task-79's own restriction — the file input is
  hidden entirely for other target stages rather than shown-then-
  rejected.
- Extended `app/api/admin/orders/[orderId]/route.ts` (task-76) by one
  field — `productionStageHistory` — so the tracker has transition
  history to render. The `Order.productionStageHistory` column already
  existed and task-79 was already writing to it; task-76's GET route
  just wasn't returning it yet.
- Extended `lib/hooks/useAdminOrderDetail.ts` (task-81) with
  `updateProductionStage(stage, note, photo, isRevert)`, which PATCHes
  task-79's route as multipart form data with the CSRF header that
  route checks (`getCsrfHeader()` from `lib/csrf.ts`) — unlike its
  task-77/78 sibling actions, which don't require CSRF. Merges an
  optimistic history entry into local state on success rather than a
  full refetch.
- Embedded `<ProductionStageTracker>` into `AdminOrderDetail.tsx`
  (task-81), rendered only when `order.hasTshirtItem` is true,
  replacing the read-only stage label task-81 originally showed as a
  placeholder for this task.
- `app/styles/adminOrderDetail.css` — added `.productionTracker*`
  rules (stepper, form, photo-upload label, spinner, history list),
  design tokens only (Rule 33).

## Scope notes
- This closes task-72 (Order Management, admin_account_specification.md
  Section 3.3) end to end — task-74 through task-82 are all DONE.
- `npx tsc --noEmit` shows zero new errors from any file touched here
  (same 38 pre-existing, Prisma-client-generation-related errors as
  task-80/81's entries — `npx prisma generate` can't reach
  `binaries.prisma.sh` in this sandbox; run it in a real dev
  environment to confirm a clean baseline before merging).
