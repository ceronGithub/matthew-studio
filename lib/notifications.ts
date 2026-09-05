/**
 * FILE: lib/notifications.ts
 * PURPOSE:
 * Task 14 (buyer_account_specification.md Section 4.6) — single
 * shared helper for creating a Notification row, called from the 3
 * existing event sources that should produce one:
 *   - app/api/paymongo/webhook/route.ts (order_update)
 *   - app/api/buyer/subscription/cancel/route.ts (billing)
 *   - a future admin-side support ticket reply route (ticket_reply)
 *     — see the "NOT YET WIRED" note at the bottom of this file.
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

/**
 * NOT YET WIRED — ticket_reply
 * docs/tasks/task-14-wire-notification-triggers.md calls for this
 * helper to be called from the admin-side support ticket reply route
 * when senderRole is "admin" (buyer should be notified of admin
 * replies, not their own). That route does not exist in this repo
 * yet — only the buyer-side reply route
 * (app/api/buyer/support/[ticketId]/reply/route.ts) is built, and it
 * always writes senderRole "buyer". Wire the following call into the
 * admin route once it's built:
 *
 *   await createNotification({
 *     userId: ticket.userId,
 *     type: "ticket_reply",
 *     title: "New reply on your support ticket",
 *     body: `An admin replied to "${ticket.subject}".`,
 *     linkHref: `/buyer/support/${ticket.id}`,
 *   });
 */
