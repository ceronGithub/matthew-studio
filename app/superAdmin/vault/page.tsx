/**
 * FILE: app/superAdmin/vault/page.tsx
 * ROLE: Super-Admin only — protected by app/superAdmin/layout.tsx's
 * middleware guard (role check only; this route carries no slug yet
 * for middleware's vault-ownership check to run against).
 *
 * PURPOSE:
 * Stable, bookmarkable entry point matching vault_specification.md
 * Section 6.1's literal route ("/superAdmin/vault"). Rule 47.2's
 * session-scoped pattern ("/<role>/vault/[slug]") is what middleware.ts
 * actually guards (task-31), so this page's only job is to resolve the
 * caller's current AdminSession id server-side and redirect there —
 * nothing client-side needs to know or store that id ahead of time.
 * Reuses getOrCreateAdminSession (task-28/29) so a visit here always
 * reuses the still-active session created at login rather than minting
 * a second one.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getOrCreateAdminSession } from "@/lib/vaultHelpers";

export default async function SuperAdminVaultEntryPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  // middleware.ts has already confirmed role === "superAdmin" for this
  // path, so a missing/invalid token here means the session expired
  // between the middleware check and this render — send back to login
  // rather than throwing.
  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };

  if (!data.user?.id) {
    redirect("/auth/login");
  }

  const { session } = await getOrCreateAdminSession(data.user.id, "superAdmin", {
    ipAddress: null,
    userAgent: null,
    deviceType: null,
  });

  redirect(`/superAdmin/vault/${session.id}`);
}
