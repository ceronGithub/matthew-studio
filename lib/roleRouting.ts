/**
 * FILE: lib/roleRouting.ts
 * PURPOSE:
 * Single source of truth for "which dashboard does this role land on"
 * (login_and_registration_page.md Section 12.3: buyer, admin, and
 * super-admin are three distinct destinations, never collapsed into
 * one). Used by middleware.ts (redirect after already-signed-in visits
 * to /auth/login, and route-guard denials) and SignInForm.tsx (redirect
 * immediately after a successful POST /api/auth/login response) so the
 * two can never drift out of sync with each other.
 *
 * Isomorphic — no Node-only or browser-only APIs — safe to import from
 * the Edge middleware runtime and from "use client" components alike.
 */

export type AccountRole = "buyer" | "admin" | "superAdmin";

const DASHBOARD_PATH_BY_ROLE: Record<AccountRole, string> = {
  buyer: "/buyer/dashboard",
  admin: "/admin/dashboard",
  superAdmin: "/superAdmin/dashboard",
};

/**
 * getDashboardPathForRole
 * Maps a role string (as stored in Supabase user_metadata.role) to its
 * dashboard route. Falls back to the buyer dashboard for any unknown or
 * missing role — the safest default, since buyer is the only
 * self-service role and every account type is expected to have a
 * recognized role value by the time this runs.
 */
export function getDashboardPathForRole(role: string | null | undefined): string {
  if (role === "admin" || role === "superAdmin" || role === "buyer") {
    return DASHBOARD_PATH_BY_ROLE[role];
  }
  return DASHBOARD_PATH_BY_ROLE.buyer;
}
