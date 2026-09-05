/**
 * FILE: lib/notifications.ts
 * PURPOSE:
 * Task 14 (buyer_account_specification.md Section 4.6) — single
 * shared helper for creating a Notification row, called from all 3
 * event sources that produce one:
 *   - app/api/paymongo/webhook/route.ts (order_update)
 *   - app/api/buyer/subscription/cancel/route.ts (billing)
 *   - app/api/admin/support/tickets/[ticketId]/reply/route.ts
 *     (ticket_reply) — wired 2026-09-06 (Task 16).
 *
 * Never called directly by a component or hook — this is
 * server-side-only, same as services/prisma.ts. Deliberately never
 * throws: a notification is a nice-to-have side effect of the real
 * action (a paid order, a cancelled subscription), so a failure here
 * must never roll back or fail the caller's actual state change.
 */
import { prisma } from "@/services/prisma";
import type { NotificationTypeKey } from "@/lib/notificationType";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationTypeKey;
  title: string;
  body: string;
  linkHref?: string | null;
}

/**
 * createNotification
 * Inserts one Notification row for the given buyer. Wrapped in
 * try/catch and logged rather than thrown — matches the
 * never-break-the-request pattern used by lib/securityLog.ts's
 * logSecurityEvent(), since the caller's own action (order paid,
 * subscription cancelled) has already succeeded by the time this
 * runs and must not be undone by a notification failure.
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  linkHref = null,
}: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, linkHref },
    });
  } catch (error) {
    console.error("[lib/notifications] Failed to create notification:", error);
  }
}

