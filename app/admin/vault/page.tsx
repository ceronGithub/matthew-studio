/**
 * FILE: app/admin/vault/page.tsx
 * ROLE: Admin (and Super-Admin, who can reach admin tooling per
 * Section 12.3) — protected by app/admin/layout.tsx's middleware guard.
 *
 * PURPOSE:
 * Stable entry point matching vault_specification.md Section 6.2's
 * literal route ("/admin/vault"). Resolves the caller's current
 * AdminSession id server-side and redirects to the session-scoped
 * page middleware.ts actually guards (task-31), mirroring
 * app/superAdmin/vault/page.tsx exactly except for the role passed to
 * getOrCreateAdminSession.
 *
 * A super-admin visiting this page (Section 12.3's cross-role access)
 * gets a session tagged role: "superAdmin" — middleware's vault check
 * already accounts for that on /admin/vault (task-31's role-match
 * branch), so no special-casing is needed here.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { getOrCreateAdminSession } from "@/lib/vaultHelpers";

export default async function AdminVaultEntryPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };

  if (!data.user?.id) {
    redirect("/auth/login");
  }

  const role = (data.user.user_metadata?.role as string) === "superAdmin" ? "superAdmin" : "admin";

  const { session } = await getOrCreateAdminSession(data.user.id, role, {
    ipAddress: null,
    userAgent: null,
    deviceType: null,
  });

  redirect(`/admin/vault/${session.id}`);
}
