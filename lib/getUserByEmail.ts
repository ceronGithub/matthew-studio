/**
 * FILE: lib/getUserByEmail.ts
 * PURPOSE:
 * Resolves a Supabase Auth userId from an email address, for
 * unauthenticated flows that only have an email to work with (the
 * forgot-password flow, task-67) — unlike lib/getSessionUserId.ts,
 * which resolves the CALLING buyer's own id from their session
 * cookie. Same underlying lookup app/api/auth/check-email/route.ts
 * already uses (Supabase's admin API has no exact-email filter, so
 * list and match), pulled out here so it isn't duplicated across
 * forgot-password/initiate and forgot-password/verify.
 *
 * Callers must treat a null result as "proceed identically to a
 * found user" wherever anti-enumeration applies (Section 4.1/4.2 of
 * buyer_password_recovery_specification.md) — this helper only
 * resolves the id, it never decides what to reveal to the client.
 */
import { supabaseAdminClient } from "@/lib/supabase/serverClient";

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdminClient.auth.admin.listUsers();
  if (error) {
    console.error("[getUserByEmail] listUsers failed:", error.message);
    return null;
  }

  const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

// Supabase's admin listUsers() returns 50 users per page by default —
// ask for the max page size and cap how many pages we walk, so a huge
// user table can never turn one lookup into an unbounded loop.
const LIST_USERS_PAGE_SIZE = 1000;
const LIST_USERS_MAX_PAGES = 20;

/**
 * getUserRoleByEmail
 * Resolves the role stored in a Supabase user's user_metadata.role
 * ("buyer" | "admin" | "superAdmin") from an email, for the login
 * lockout check (task-123), which has to know whether an email belongs
 * to an admin BEFORE the password is checked.
 *
 * Returns null when the email has no account OR the lookup fails —
 * the caller treats both the same (no lockout applies, the normal
 * login path runs and fails generically). A missing role on an
 * existing account is a buyer, same default app/api/auth/login uses.
 */
export async function getUserRoleByEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= LIST_USERS_MAX_PAGES; page += 1) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({
      page,
      perPage: LIST_USERS_PAGE_SIZE,
    });
    if (error) {
      console.error("[getUserByEmail] listUsers (role lookup) failed:", error.message);
      return null;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return (match.user_metadata?.role as string | undefined) ?? "buyer";

    // A short page means this was the last one — the email doesn't exist.
    if (data.users.length < LIST_USERS_PAGE_SIZE) return null;
  }
  return null;
}
