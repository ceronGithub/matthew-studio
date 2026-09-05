# Task 13 — Notification bell + /buyer/notifications page

- Bell icon in components/buyer/BuyerNav.tsx with unread-count badge
- /buyer/notifications page: list, mark-as-read on open, "Mark all
  as read" action, click deep-links via linkHref
- Custom hook lib/hooks/useBuyerNotifications.ts (list + mark-read +
  mark-all-read), same pattern as useBuyerSupportTickets.ts
- Rule 25 loading/empty/error states

Independently completable: UI + hook, consumes Task 12's routes.
