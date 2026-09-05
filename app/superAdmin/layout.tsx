/**
 * FILE: app/superAdmin/layout.tsx
 * ROLE: Super-Admin only — every page under /superAdmin/* is already
 * guarded by middleware.ts (role must be "superAdmin"), so by the
 * time this renders a valid session exists.
 *
 * PURPOSE:
 * Shell for the super-admin area: top bar (RoleAreaHeader) plus a
 * server-side account-activity beacon (Rule 42) that records this
 * page view against the signed-in account. Uses the x-pathname
 * header middleware.ts forwards on every matched request — no
 * client-side beacon needed for page views.
 */
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import { recordAccountActivity } from "@/lib/accountActivity";
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

  // Record this page view against the signed-in account (Rule 42) —
  // never awaited into the render path failing; recordAccountActivity
  // never throws, so this is safe to await directly.
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "/superAdmin";
  if (data.user?.email) {
    await recordAccountActivity({ accountId: data.user.email, action: pathname });
  }

  return (
    <div className="roleAreaShell">
      <RoleAreaHeader displayName={displayName} roleLabel="Super-Admin" />
      <main className="roleAreaMain">{children}</main>
    </div>
  );
}
