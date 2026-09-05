# Task 15 — Admin session helper + read-only ticket routes

Per admin_support_ticket_specification.md Sections 3-4.

- New `lib/getSessionAdmin.ts` — resolves the calling account's
  Supabase user + `user_metadata.role` from the `sb-access-token`
  cookie (same pattern as `lib/getSessionUserId.ts`), returns `null`
  unless role is `"admin"` or `"superAdmin"`. Needed because
  `/api/admin/*` isn't in `middleware.ts`'s matcher — every route
  self-checks, same as `/api/buyer/*`.
- `GET /api/admin/support/tickets` — paginated (20/page), newest
  `updatedAt` first, optional `?status=` filter. Each row includes
  buyer email resolved via `supabaseAdminClient.auth.admin.getUserById(userId)`.
- `GET /api/admin/support/tickets/[ticketId]` — full ticket +
  `messages` thread + buyer email, no ownership scoping (admin sees
  all buyers' tickets, unlike the buyer-side route).

Independently completable: read-only, no mutations, no notification
wiring (that's Task 16). Does not touch UI (Task 17/18).
