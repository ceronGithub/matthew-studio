/**
 * FILE: lib/getAdminAuthUser.ts
 * PURPOSE:
 * Shared lookup for app/api/superadmin/admin-management/[adminId]/
 * route.ts (task-94) and, going forward, task-95's actions route —
 * resolves a Supabase Auth user by id and confirms its role is
 * "admin", so a buyer or super-admin id typed into either route's
 * URL 404s instead of leaking that account's info or letting a
 * super-admin action target the wrong kind of account by mistake.
 *
 * Mirrors lib/getBuyerAuthUser.ts's exact shape (Rule 2 — same
 * pattern, not a copy-pasted near-duplicate with drift risk) but
 * checks role === "admin" instead of "buyer". Deliberately excludes
 * "superAdmin" — this app's Admin Management area manages admin
 * accounts a super-admin created (task-99), never other super-admins.
 */
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import type { User } from "@supabase/supabase-js";

/**
 * getAdminAuthUser
 * Returns the admin's Supabase Auth user record, or null if the id
 * doesn't exist or doesn't resolve to role "admin".
 */
export async function getAdminAuthUser(adminId: string): Promise<User | null> {
  const { data, error } = await supabaseAdminClient.auth.admin.getUserById(adminId);
  const authUser = data?.user;
  if (error || !authUser) return null;

  const role = (authUser.user_metadata?.role as string | undefined) ?? null;
  if (role !== "admin") return null;

  return authUser;
}
