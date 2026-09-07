/**
 * FILE: lib/getBuyerAuthUser.ts
 * PURPOSE:
 * Shared lookup used by both app/api/admin/users/[buyerId]/route.ts
 * (task-85) and app/api/admin/users/[buyerId]/actions/route.ts
 * (task-86) — resolves a Supabase Auth user by id and confirms its
 * role is "buyer", so an admin/super-admin id typed into either
 * route's URL 404s instead of leaking that account's info or letting
 * an admin action target another admin account by mistake.
 *
 * Extracted here rather than duplicated per Rule 2 (no needless
 * duplicate logic) once a second call site needed the exact same
 * check.
 */
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import type { User } from "@supabase/supabase-js";

/**
 * getBuyerAuthUser
 * Returns the buyer's Supabase Auth user record, or null if the id
 * doesn't exist or doesn't resolve to role "buyer".
 */
export async function getBuyerAuthUser(buyerId: string): Promise<User | null> {
  const { data, error } = await supabaseAdminClient.auth.admin.getUserById(buyerId);
  const authUser = data?.user;
  if (error || !authUser) return null;

  const role = (authUser.user_metadata?.role as string | undefined) ?? "buyer";
  if (role !== "buyer") return null;

  return authUser;
}
