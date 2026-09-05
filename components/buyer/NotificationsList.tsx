/**
 * FILE: components/buyer/NotificationsList.tsx
 * ROLE: Buyer only — rendered inside app/buyer/notifications/page.tsx.
 *
 * PURPOSE:
 * Full notification history (Task 13, Section 4.6): every
 * notification, newest first, paginated, with "Mark all as read" and
 * per-row click-to-open (marks read + deep-links via linkHref).
 * Handles all three required data states (Rule 25), same
 * card/pagination pattern as SupportTicketsList.tsx.
 */
"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useBuyerNotifications } from "@/lib/hooks/useBuyerNotifications";
import { getNotificationTypeDisplay } from "@/lib/notificationType";

function formatNotificationDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsList() {
  const { notifications, unreadCount, totalPages, page, isLoading, error, goToPage, refetch, markAsRead, markAllAsRead } =
    useBuyerNotifications();
  const router = useRouter();

  async function handleRowClick(id: string, isRead: boolean, linkHref: string | null) {
    if (!isRead) await markAsRead(id);
    if (linkHref) router.push(linkHref);
  }

  if (isLoading) {
    return (
      <div className="notificationsGrid">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="notificationCard notificationCard--skeleton">
            <div className="notificationSkeletonLine skeletonBlock" />
            <div className="notificationSkeletonLine skeletonBlock notificationSkeletonLine--short" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="notificationsEmptyState">
        <Bell size={32} />
        <p>{error}</p>
        <button type="button" className="notificationsRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="notificationsToolbar">
        {unreadCount > 0 && (
          <button type="button" className="notificationsMarkAllButton" onClick={() => markAllAsRead()}>
            <CheckCheck size={16} /> Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="notificationsEmptyState">
          <Bell size={32} />
          <p>No notifications yet.</p>
          <p className="notificationsEmptyStateHint">
            Order updates, billing events, and support replies will show up here.
          </p>
        </div>
      ) : (
        <ul className="notificationsGrid">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                className={`notificationCard${notification.isRead ? "" : " notificationCard--unread"}`}
                onClick={() => handleRowClick(notification.id, notification.isRead, notification.linkHref)}
              >
                <div className="notificationCardHeader">
                  <span className="notificationCardType">{getNotificationTypeDisplay(notification.type).label}</span>
                  <span className="notificationCardDate">{formatNotificationDate(notification.createdAt)}</span>
                </div>
                <p className="notificationCardTitle">{notification.title}</p>
                <p className="notificationCardBody">{notification.body}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="notificationsPagination">
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
