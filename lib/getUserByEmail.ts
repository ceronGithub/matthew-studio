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
