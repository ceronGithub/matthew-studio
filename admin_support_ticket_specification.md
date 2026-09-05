# Admin Support Ticket Specification

## Status
APPROVED (2026-09-06) — task-planned as docs/tasks/task-15 through
task-18. Build order: 15 → 16 → 17 → 18.

## 1. Purpose & Overview
Buyers can already open and reply to support tickets
(`buyer_account_specification.md` Section 4.5 — Task 08/10, fully
built). Nothing on the admin side can see or answer them yet —
`app/admin/` is a single placeholder dashboard listing "planned
sections," and no `app/api/admin/` directory exists at all.

This spec adds the minimum admin-side surface needed to close that
loop: a ticket inbox, a thread view, and the ability to reply — which
also unblocks Task 14's third notification source (buyer gets
notified when an admin replies). No new buyer-facing behavior.

## 2. Core Features
- **Ticket inbox** (`/admin/support`) — every ticket across all
  buyers, newest-activity first. Filter by status (`open` / `answered`
  / `closed`). Each row shows subject, buyer email, status badge, and
  last-updated time.
- **Ticket detail** (`/admin/support/[ticketId]`) — full message
  thread (buyer + admin messages, visually distinguished — reuses the
  buyer-side thread styling pattern from `app/buyer/support/[ticketId]`),
  a reply box, and a manual "Close ticket" action.
- **Reply → auto-status flip**: an admin reply sets `status` to
  `"answered"` (mirrors the buyer side's reply-reopens-a-closed-ticket
  logic, in reverse — an admin answering is evidence the ticket
  no longer needs "open" attention). A buyer replying afterward still
  flips it back to `"open"` per the existing buyer-side route —
  unchanged.
- **Manual close**: admin can close a ticket directly (e.g. resolved
  with no further reply needed) via a status-only PUT, guarded by
  Rule 34.4's confirmation modal since it's a state change a buyer
  will see reflected on their side.
- **Notification on reply** (Task 14 completion): every admin reply
  calls `lib/notifications.ts`'s `createNotification()` with
  `type: "ticket_reply"`, closing the gap flagged in that file's
  header comment.

## 3. Data Model
No schema changes. Reuses existing models as-is:
- `SupportTicket` (`id, userId, subject, status, orderId, createdAt, updatedAt`)
- `TicketMessage` (`id, ticketId, senderRole, body, createdAt`) —
  `senderRole: "admin"` already anticipated in the schema comment,
  simply unused until now.

Buyer email/name for the inbox list and thread header is **not**
stored in Prisma (auth lives in Supabase, no local `User` table) —
resolved per ticket via `supabaseAdminClient.auth.admin.getUserById(userId)`
server-side, same source `lib/getSessionUserId.ts` already reads from.

New file: `lib/getSessionAdmin.ts` — the admin-route equivalent of
`lib/getSessionUserId.ts`, resolving the calling account's Supabase
user + `user_metadata.role`, returning `null` unless role is
`"admin"` or `"superAdmin"` (mirrors `middleware.ts`'s existing
`/admin/*` rule, since `/api/admin/*` isn't in `middleware.ts`'s
matcher and each route must self-check, same pattern already used by
every `/api/buyer/*` route).

## 4. API Endpoints
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/admin/support/tickets` | Paginated list, all buyers, optional `?status=` filter |
| GET | `/api/admin/support/tickets/[ticketId]` | Full thread + buyer email for one ticket |
| POST | `/api/admin/support/tickets/[ticketId]/reply` | Admin reply — creates `TicketMessage` (`senderRole: "admin"`), sets status `"answered"`, fires `createNotification()` |
| PUT | `/api/admin/support/tickets/[ticketId]/status` | Manual status change (`"closed"` only, for now) |

All four: CSRF-checked on mutations (Rule 32.2), Rule 28 response
shape, `force-dynamic`, guarded by `getSessionAdmin()`.

## 5. User Flow
1. Admin signs in → `/admin/dashboard` (existing) → new "Support
   Tickets" link in the planned-sections list, now live instead of
   a placeholder bullet.
2. Lands on `/admin/support` → sees every ticket, newest activity
   first, `open` ones visually prioritized (Rule 17 badge treatment).
3. Clicks a row → `/admin/support/[ticketId]` → reads the thread,
   types a reply, submits.
4. Reply lands → ticket flips to `answered` → buyer gets a
   `ticket_reply` Notification (bell badge + `/buyer/notifications`)
   linking back to `/buyer/support/[ticketId]`.
5. If resolved with no reply needed, admin can close the ticket
   directly via a confirmation-modal-gated action.
