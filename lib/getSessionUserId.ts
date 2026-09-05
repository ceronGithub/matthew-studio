/**
 * FILE: lib/getSessionUserId.ts
 * PURPOSE:
 * Resolves the current buyer's Supabase user ID from the
 * sb-access-token cookie, for use inside API route handlers under
 * /api/buyer/*. middleware.ts already blocks any request to
 * /buyer/* whose role isn't "buyer" before it reaches here, so this
 * is a second, request-scoped lookup to get the actual userId to
 * scope database queries by (Section 2 of
 * buyer_account_specification.md: every query WHERE userId = current
 * buyer's id — never trust a client-submitted id).
 *
 * Same token-to-user resolution middleware.ts and app/buyer/layout.tsx
 * already perform — pulled out here so every /api/buyer/* route
 * doesn't duplicate the Supabase admin lookup inline.
 */
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

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
 * getSessionUser
 * Resolves the full Supabase user object (not just the id) for the
 * calling buyer — used by /api/buyer/profile, which needs email,
 * created_at, and the existing user_metadata to merge updates into.
 */
export async function getSessionUser(request: Request) {
  const accessToken = getAccessTokenFromCookie(request);
  if (!accessToken) return null;

  const { data } = await supabaseAdminClient.auth.getUser(accessToken);
  return data.user ?? null;
}

export async function getSessionUserId(request: Request): Promise<string | null> {
  const user = await getSessionUser(request);
  return user?.id ?? null;
}
