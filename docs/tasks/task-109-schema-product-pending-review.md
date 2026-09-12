# task-109 — schema: add `pending-review` to Product.status

**Fulfills spec:** Section 9.2 (Product approval flow — admin-created/
edited products save as `pending-review`, not live, until super-admin
approves), `super_admin_account_specification.md`.
**taskPlan.md phase:** Phase 6 — Product & Order Management w/
approval flow (task-48+ tracker).
**Dependency:** none — first task in this split.

## What this builds
Adds `"pending-review"` as a valid value alongside the existing
`"draft"` / `"published"` on `Product.status` in
`prisma/schema.prisma`. Since `status` is a plain `String` (not a
Prisma `enum`), this is a comment/default-value update plus the
migration — no structural column change needed.

- Update the inline comment on `Product.status` to document all
  three states: `draft | pending-review | published`.
- No change to `status`'s existing `@default("draft")` — new products
  created by admins move to `pending-review` at the API layer
  (task-110), not via a schema default change.
- No change to the existing `@@index([status])` — it already covers
  the new value.

## Notes
- This is schema-only, per Rule 49 Step 4's per-layer splitting —
  task-110/111/112 depend on this but must not be bundled into it.
- Run in terminal after this change: `npx prisma db push` then
  `npx prisma generate` (Rule 21/37.2 — Supabase-safe, never
  `migrate dev`/`migrate deploy`).

## Verification
1. Run `npx prisma db push && npx prisma generate`.
2. Confirm no errors and that the Prisma Client regenerates cleanly.
3. Manually set an existing test product's `status` to
   `"pending-review"` via Prisma Studio or a script — confirm it
   saves without a validation error (proves the column accepts the
   new string value with no constraint blocking it).
