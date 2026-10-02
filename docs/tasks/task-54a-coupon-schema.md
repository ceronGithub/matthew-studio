# task-54a — coupon-schema — Coupon model + discount fields on Order

**Fulfills:** additional_platform_gaps_specification.md §4.1 (Coupon / Discount / Promo Codes), §5, §6, §7
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 12 (parent: task-54)
**Dependency:** none
**NEEDS:** none
**SETUP:** npx prisma db push && npx prisma generate
**FILES TO TOUCH:** prisma/schema.prisma (existing)
**DONE WHEN:**
- `Coupon` model exists with the spec §5 fields (id, code unique, discountType, discountValue, usageLimit, usageCount, expiresAt, scopeCategory, createdAt) plus `isActive Boolean @default(true)` so a coupon can be switched off without deleting it.
- `Order` has `couponCode String?` and `discountAmount Float @default(0)`; existing orders keep working (nullable / defaulted).
- `npx prisma db push` and `npx prisma generate` both succeed against the real database.
- `npx tsc --noEmit` adds no new errors.

## Notes
- Prisma 7 + Supabase: use `db push`, never `migrate dev/deploy` (Rule 37.2).
- `code` is stored upper-case and trimmed (Rule 6 normalization); the unique constraint is the database-level backup to the app check.
- `isActive` is an addition to the spec's model; it is the soft-off switch (Rule 6 soft-delete spirit) and is needed by task-54g.
- Order keeps `subtotal` as the pre-discount amount; `total = subtotal - discountAmount + shippingFee`.
