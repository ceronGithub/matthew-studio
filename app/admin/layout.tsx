/**
 * FILE: app/admin/layout.tsx
 * ROLE: Admin only — every page under /admin/* is already guarded by
 * middleware.ts (role must be "admin" or "superAdmin"), so by the
 * time this renders a valid session exists.
 *
 * PURPOSE:
 * Placeholder shell for the admin area, mirroring app/buyer/layout.tsx's
 * pattern: read the session cookie server-side for a display name, then
 * render RoleAreaHeader + page content. This exists so
 * getDashboardPathForRole("admin") in middleware.ts/SignInForm.tsx has
 * a real destination instead of a 404 — the full admin dashboard
 * (products, orders, users, analytics per admin_account_specification.md)
 * is a separate, larger build.
 */
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import RoleAreaHeader from "@/components/shared/RoleAreaHeader";
import "../styles/roleAreaDashboard.css";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };

  const displayName =
    (data.user?.user_metadata?.fullName as string | undefined) ?? data.user?.email ?? "there";

  return (
    <div className="roleAreaShell">
      <RoleAreaHeader displayName={displayName} roleLabel="Admin" />
      <main className="roleAreaMain">{children}</main>
    </div>
  );
}
