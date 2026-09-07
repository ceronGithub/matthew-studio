# task-79 — Admin Order Production-Stage API

**Spec:** admin_account_specification.md Section 3.3.3 (T-Shirt Production
Tracking) + its `PUT /api/admin/orders/[orderId]/production-stage`
endpoint definition
**Phase:** 3 (remainder) — item 4, task-72 order-management split
**Depends on:** task-74 (schema — `productionStage`/`productionStageHistory`
already added), task-76 (detail route — same category-join pattern reused)
**Status:** DONE — built 2026-09-07

## What was built
`PATCH /api/admin/orders/[orderId]/production-stage/route.ts` —
accepts multipart form data (`productionStage`, optional `note`,
optional `photo` file), validates the order actually contains a
`tshirts`-category item, computes advance vs. revert server-side from
pipeline position (never trusts a client-supplied `isRevert` flag),
requires a note on any revert, optionally uploads a proof photo to R2
(quality_check/packed stages only), appends to
`productionStageHistory`, auto-syncs the top-level `status` to
`"Shipped"` + notifies the buyer when the stage reaches `shipped`, and
logs `order_production_stage_updated` to SecurityLog.

## Design decisions
- **HTTP method — PATCH, not PUT:** the spec's endpoint header says
  `PUT`, but this task's own line in `docs/taskPlan.md` specifies
  `PATCH`. Went with PATCH — it's a partial update (one field plus an
  optional side-effect field), which is what PATCH means; the spec's
  `PUT` appears to be a carry-over from copy/paste of the neighboring
  status-update endpoint. No functional difference for a Next.js route
  handler either way.
- **Request body — multipart form data, not the spec's literal JSON
  example:** the endpoint accepts an optional file (proof photo), so
  it can't be plain JSON. Follows the same dedicated-route convention
  as task-24's cover-image upload rather than inventing a generic
  upload endpoint.
- **Direction computed server-side:** the spec's JSON example includes
  an `isRevert` field from the client, but trusting that alone would
  let a caller skip the required-note check by sending
  `isRevert: false` while still requesting an earlier stage index.
  This route derives direction itself from `STAGE_ORDER` index
  comparison; the client's intent doesn't matter for the validation
  gate, only the actual before/after stage positions.
- **Top-level status stays capitalized ("Shipped"):** the spec's
  example shows lowercase `"shipped"`, but the app's actual
  `Order.status` values are the capitalized set already established
  by task-77's `VALID_STATUSES` (`Confirmed`/`Shipped`/`Delivered`/
  `Cancelled`) — matched that instead of the spec's literal casing.
- **Stage order sourced from `lib/orderStatus.ts`:** `PRODUCTION_STAGE_LABELS`
  was already the single source of truth for the 6 stages (added
  alongside task-74/76); reused its key order rather than duplicating
  a second stage list.

## Verification
`npx tsc --noEmit` could not be run to a clean pass in this sandbox —
`npx prisma generate` fails here because the sandbox's network egress
doesn't allow `binaries.prisma.sh` (403 Forbidden), so `@prisma/client`
has no generated types and every Prisma-touching file in the repo
(including already-DONE files like task-76's route) shows the same
`Property 'category' does not exist on type '{}'` / implicit-any
errors. This is an environment limitation, not a defect introduced by
this file — confirmed by diffing the error set against task-76's
pre-existing route, which shows the identical error shape. Run
`npx prisma generate && npx tsc --noEmit` in a real dev environment
before merging to confirm.
