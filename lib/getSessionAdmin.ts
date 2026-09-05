/**
 * FILE: lib/getSessionAdmin.ts
 * PURPOSE:
 * Resolves the current admin/super-admin's Supabase user from the
 * sb-access-token cookie, for use inside API route handlers under
 * /api/admin/*. Unlike /admin/* page routes, /api/admin/* is NOT in
 * middleware.ts's matcher, so each route needs its own request-scoped
 * check — same reason lib/getSessionUserId.ts exists for /api/buyer/*.
 *
 * Mirrors middleware.ts's own /admin/* rule (role "admin" OR
 * "superAdmin" — a super-admin can reach admin tooling too, per
 * that file's header comment), rather than duplicating a slightly
 * different check that could drift out of sync with the page-level
 * guard.
 */
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

export interface SessionAdmin {
  id: string;
  email: string | null;
  role: "admin" | "superAdmin";
}

function getAccessTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("sb-access-token="));

  return match ? decodeURIComponent(match.slice("sb-access-token=".length)) : null;
}

/**
 * getSessionAdmin
 * Returns the calling account's id/email/role only if that role is
 * "admin" or "superAdmin" — null for anyone else (no session, buyer
 * role, or a token that fails Supabase validation). Callers should
 * treat null as a 401, same pattern as getSessionUserId() returning
 * null for /api/buyer/* routes.
 */
export async function getSessionAdmin(request: Request): Promise<SessionAdmin | null> {
  const accessToken = getAccessTokenFromCookie(request);
  if (!accessToken) return null;

  const { data } = await supabaseAdminClient.auth.getUser(accessToken);
  const user = data.user;
  if (!user) return null;

  const role = (user.user_metadata?.role as string) ?? null;
  if (role !== "admin" && role !== "superAdmin") return null;

  return { id: user.id, email: user.email ?? null, role };
}
