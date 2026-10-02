# task-52a — idle-timeout-hook-and-guard — useIdleTimeout hook + IdleSessionGuard client component

**Fulfills:** sitewide_technical_seo_specification.md §4.3 (Idle Session Timeout, Rule 32.5)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 11 (parent: task-52)
**Dependency:** none
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** hooks/useIdleTimeout.ts, components/shared/IdleSessionGuard.tsx (both new)
**DONE WHEN:**
- `useIdleTimeout(onIdle, idleMinutes)` fires `onIdle` once after `idleMinutes` with no `mousemove`, `mousedown`, `keydown`, `scroll` or `touchstart`; any of those resets the countdown.
- The countdown also fires when the tab or device was asleep past the deadline: the timer compares the real clock with a stored last-activity time, and `visibilitychange` re-runs that check on wake.
- `IdleSessionGuard` (client component, renders nothing) takes `idleMinutes` (default 30), calls `POST /api/auth/logout` with `getCsrfHeader()`, then `router.push("/auth/login?reason=idle")` even if the request fails.
- Listeners and timers are removed on unmount; `onIdle` can only fire once per mount.
- `npx tsc --noEmit` reports no errors in the two new files.

## Notes
- Layouts under app/buyer, app/admin and app/superAdmin are Server Components, so the hook cannot go in them directly. The guard is a small client component each layout renders (task-52b).
- The logout endpoint (`app/api/auth/logout/route.ts`) already expires both cookies, expires AdminSession rows and sends `Clear-Site-Data` in production. Calling it satisfies spec §4.3 / Rule 44.4 ("same logic as manual logout"). No change to the route is needed.
- A toast cannot survive `router.push`, so the reason travels as `?reason=idle` and the login page shows the toast (task-52b).
- `mousemove` fires constantly: activity events only write a timestamp; the single timer re-schedules itself for the remaining time when it fires.
- Per Rule 32.5, tabs are independent: one tab idling out does not log out the others in the hook; the shared cookie means the next request from another tab will hit middleware as signed out.
