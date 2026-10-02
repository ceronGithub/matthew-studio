# task-51 — global-error-boundaries — root not-found.tsx, error.tsx, global-error.tsx

**Fulfills:** sitewide_technical_seo_specification.md §4.2 (Global Error Handling)
**taskPlan.md phase:** PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING, item 11
**Dependency:** none
**NEEDS:** none
**SETUP:** none
**FILES TO TOUCH:** app/not-found.tsx, app/error.tsx, app/global-error.tsx, components/shared/ErrorState.tsx, app/styles/errorPages.css (all new)
**DONE WHEN:**
- A URL that matches no route shows a branded 404 (message, the 6 category shortcuts, a CTA to /shop) instead of the default Next.js page.
- An unhandled render error anywhere without a closer boundary shows a friendly message and a working "Try again" button; the raw error message and stack are never shown.
- An error thrown in the root layout shows the branded fallback from global-error.tsx (own html/body, theme applied inside it).
- All three pages work in light and dark theme and at 375px, 768px and 1280px.
- `npx tsc --noEmit` reports no errors in the new files.

## Notes
- Installed Next.js is 16.3.0, where the error boundary props are `error` and `retry` (`retry` became stable in 16.3.0). Rule 31.10 in the protocol still shows `reset`; `retry` is used here because it re-fetches the segment, which is what "Try again" should do. `reset` is still passed by Next.js.
- Spec §4.2 also recommends per-segment `error.tsx` for app/buyer/ and app/(public)/shop/. Not part of this task: ErrorState is built so each one is a thin wrapper, tracked in docs/openFindings.md.
- global-error.tsx replaces the root layout when active, so it imports the global tokens itself and sets data-theme from the same localStorage key the root layout script uses.
