# task-52b — idle-timeout-wire-layouts — mount the guard per account layout + inactivity toast on login

**Fulfills:** sitewide_technical_seo_specification.md §4.3; admin_account_specification.md §5.2 and super_admin_account_specification.md §5.2 (15-minute idle)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 11 (parent: task-52)
**Dependency:** task-52a
**NEEDS:** task-52a
**SETUP:** none
**FILES TO TOUCH:** app/buyer/layout.tsx, app/admin/layout.tsx, app/superAdmin/layout.tsx, app/auth/login/page.tsx, lib/errorMessages.ts (all existing)
**DONE WHEN:**
- Each of the three layouts renders `<IdleSessionGuard idleMinutes={...} />`: buyer 30, admin 15, superAdmin 15.
- The guard is not in the root layout, the public layout or the auth layout.
- Visiting `/auth/login?reason=idle` shows a warning toast "Your session expired due to inactivity. Please log in again." and then removes the query param; a normal visit to `/auth/login` shows no toast.
- The message text lives in `lib/errorMessages.ts` (Rule 34.1), not inline in the page.
- Leaving a buyer session untouched for the set time lands on the login page with the toast, and the old cookies no longer open `/buyer/dashboard`.
- `npx tsc --noEmit` reports no new errors in the touched files.

## Notes
- The spec names `app/admin/layout.jsx`; the real file is `app/admin/layout.tsx`.
- `app/auth/login/page.tsx` is already a client page that owns `useToast()`. Reading `useSearchParams()` there needs a `<Suspense>` boundary in Next.js 16, so move the page body into a small inner component.
- Spec §4.3 recommends a shorter timeout for super-admin; the two account specs both state 15 minutes, so 15 is used for admin and superAdmin.
- To test without waiting, `IdleSessionGuard` accepts a fractional `idleMinutes` (e.g. 0.2) locally; do not commit it.
