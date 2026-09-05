/**
 * FILE: components/buyer/NotificationBell.tsx
 * ROLE: Buyer only — rendered inside BuyerNav.tsx on every /buyer/*
 * page.
 *
 * PURPOSE:
 * Bell icon with an unread-count badge (Task 13, Section 4.6). Click
 * opens a dropdown showing the 5 most recent notifications; clicking
 * one marks it read and navigates to its linkHref (if any). "Mark all
 * as read" clears the badge without navigating. "View all" links to
 * the full /buyer/notifications page. Extracted out of BuyerNav.tsx
 * as its own file per Rule 31.4 — this owns real state/effects, not
 * just markup, so it doesn't belong inline in the nav shell.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useBuyerNotifications } from "@/lib/hooks/useBuyerNotifications";
import { getNotificationTypeDisplay } from "@/lib/notificationType";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useBuyerNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Closes the dropdown on outside click — standard dropdown
  // behavior, no dedicated shared dropdown component exists yet in
  // this project so this is self-contained here.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleNotificationClick(id: string, linkHref: string | null) {
    await markAsRead(id);
    setIsOpen(false);
    if (linkHref) router.push(linkHref);
  }

  const recentFive = notifications.slice(0, 5);

  return (
    <div className="notificationBellContainer" ref={containerRef}>
      <button
        type="button"
        className="notificationBellButton"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notificationBellBadge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notificationBellDropdown">
          <div className="notificationBellDropdownHeader">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="notificationBellMarkAll" onClick={() => markAllAsRead()}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="notificationBellEmpty">Loading…</div>
          ) : recentFive.length === 0 ? (
            <div className="notificationBellEmpty">No notifications yet.</div>
          ) : (
            <ul className="notificationBellList">
              {recentFive.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={`notificationBellItem${notification.isRead ? "" : " notificationBellItem--unread"}`}
                    onClick={() => handleNotificationClick(notification.id, notification.linkHref)}
                  >
                    <span className="notificationBellItemType">
                      {getNotificationTypeDisplay(notification.type).label}
                    </span>
                    <span className="notificationBellItemTitle">{notification.title}</span>
                    <span className="notificationBellItemTime">{formatRelativeTime(notification.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link href="/buyer/notifications" className="notificationBellViewAll" onClick={() => setIsOpen(false)}>
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
