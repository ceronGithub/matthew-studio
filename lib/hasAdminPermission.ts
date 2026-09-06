/**
 * FILE: lib/hasAdminPermission.ts
 * PURPOSE:
 * Checks whether the calling admin holds a specific permission from
 * admin_account_specification.md Section 4.1 (manage-products,
 * manage-orders, manage-users, view-analytics, view-security-logs,
 * manage-promotions). Every /api/admin/* route that gates on a named
 * permission (Section 4.3) should call this rather than re-reading
 * user_metadata directly, so the super-admin bypass rule below stays
 * consistent everywhere it's used.
 *
 * DATA FLOW:
 * 1. super-admin always returns true — Section 4.2 draws the
 *    permission system as an admin-only "least privilege" ceiling;
 *    the super-admin sits above it, not inside it.
 * 2. admin: fetch the full Supabase user (getSessionAdmin() only
 *    returns id/email/role, not the permissions array) and check
 *    user_metadata.permissions.
 */
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import type { SessionAdmin } from "@/lib/getSessionAdmin";

export async function hasAdminPermission(
  admin: SessionAdmin,
  permission: string
): Promise<boolean> {
  if (admin.role === "superAdmin") return true;

  const { data } = await supabaseAdminClient.auth.admin.getUserById(admin.id);
  const permissions = (data.user?.user_metadata?.permissions as string[] | undefined) ?? [];

  return permissions.includes(permission);
}
