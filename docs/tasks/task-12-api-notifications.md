# Task 12 — Notification API routes

- GET /api/buyer/notifications — list current user's notifications,
  paginated, newest first
- PUT /api/buyer/notifications/[id]/read — mark one as read
- PUT /api/buyer/notifications/read-all — mark all as read
- All follow Rule 28 response shape + force-dynamic (Rule 31.3)
- Ownership check: userId must match session (Rule 6)

Independently completable: routes only, no UI yet.
