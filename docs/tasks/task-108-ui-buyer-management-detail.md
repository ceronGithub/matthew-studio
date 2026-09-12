# task-108 — UI: /superAdmin/buyer-management/[buyerId] detail page

**Fulfills spec:** Section 3.8 (super-admin buyer detail —
deactivate/reactivate/reset/**delete** actions, distinct route from
`/admin/users/[buyerId]`).
**taskPlan.md phase:** Phase 5 — Buyer Management.
**Dependency:** task-106 (delete action must exist), task-107
(list page must exist to link from).

## What this builds
`app/superAdmin/buyer-management/[buyerId]/page.tsx` + a new
`components/buyer-management/BuyerManagementDetail.tsx` — mirrors
`AdminUserDetail.tsx` (350 lines) but adds a **Delete Account**
button wired through the shared `ConfirmationModal`
(`components/shared/ConfirmationModal.tsx`, Rule 34.4 — names the
buyer's email in the body, confirm label "Delete Account", red
destructive style) calling task-106's new `delete` action. Also
folds in the small dashboard wiring: adds a "Buyer Management" entry
to `app/superAdmin/dashboard/page.tsx`'s `QUICK_ACTIONS` list, same
precedent as task-105 folding its own dashboard link into the same
task rather than a separate micro-task.

## Notes
- Deactivate/Reactivate/Reset Password buttons call the same
  existing actions route as `/admin/users/[buyerId]` already does —
  no new logic there, just re-pointed at the super-admin route tree.
- Delete is the only action requiring the confirmation modal — the
  other three already toast-confirm without a modal gate on the
  `/admin` side, and there's no reason to diverge from that
  precedent for this page.

## Verification
1. From `/superAdmin/buyer-management`, open a test buyer's detail
   page.
2. Expected: same account info shown as `/admin/users/[buyerId]`
   for that buyer (shared data source).
3. Click Delete Account → confirmation modal names the buyer's
   email → Confirm → buyer is removed from the list on return.
4. Cancel on the modal → nothing happens, buyer still listed.
5. Dashboard: "Buyer Management" quick action card links correctly
   to `/superAdmin/buyer-management`.
