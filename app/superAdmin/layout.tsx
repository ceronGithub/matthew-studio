/**
 * FILE: app/superAdmin/layout.tsx
 * ROLE: Super-Admin only — every page under /superAdmin/* is already
 * guarded by middleware.ts (role must be "superAdmin"), so by the
 * time this renders a valid session exists.
 *
 * PURPOSE:
 * Placeholder shell for the super-admin area, same pattern as
 * app/admin/layout.tsx and app/buyer/layout.tsx. Exists so
 * getDashboardPathForRole("superAdmin") in middleware.ts/SignInForm.tsx
 * has a real destination instead of a 404 — the full super-admin
 * dashboard (admin management, security logs, account activity,
 * backups, vault per super_admin_account_specification.md) is a
 * separate, larger build.
 */
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import RoleAreaHeader from "@/components/shared/RoleAreaHeader";
import "../styles/roleAreaDashboard.css";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };

  const displayName =
    (data.user?.user_metadata?.fullName as string | undefined) ?? data.user?.email ?? "there";

  return (
    <div className="roleAreaShell">
      <RoleAreaHeader displayName={displayName} roleLabel="Super-Admin" />
      <main className="roleAreaMain">{children}</main>
    </div>
  );
}
