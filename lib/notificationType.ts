/**
 * FILE: lib/notificationType.ts
 * PURPOSE:
 * Maps a Notification.type value to a human-readable label, matching
 * the display-lookup pattern already used by lib/ticketStatus.ts and
 * lib/orderStatus.ts. Keeps the four known types (Section 5 of
 * buyer_account_specification.md) as the single source of truth for
 * copy, rather than duplicating strings across BuyerNav's dropdown
 * and the /buyer/notifications page.
 */

export type NotificationTypeKey = "order_update" | "billing" | "ticket_reply" | "announcement";

interface NotificationTypeDisplay {
  label: string;
}

const NOTIFICATION_TYPE_DISPLAY: Record<NotificationTypeKey, NotificationTypeDisplay> = {
  order_update: { label: "Order update" },
  billing: { label: "Billing" },
  ticket_reply: { label: "Support reply" },
  announcement: { label: "Announcement" },
};

/**
 * resolveNotificationTypeKey
 * Falls back to "announcement" for any unrecognized value rather than
 * throwing — a future type added server-side before the client map
 * is updated should still render something sensible.
 */
export function resolveNotificationTypeKey(rawType: string): NotificationTypeKey {
  return (rawType in NOTIFICATION_TYPE_DISPLAY ? rawType : "announcement") as NotificationTypeKey;
}

export function getNotificationTypeDisplay(rawType: string): NotificationTypeDisplay {
  return NOTIFICATION_TYPE_DISPLAY[resolveNotificationTypeKey(rawType)];
}
