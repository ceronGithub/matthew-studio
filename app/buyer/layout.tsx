/**
 * FILE: app/buyer/layout.tsx
 * ROLE: Buyer only — every page under /buyer/* is already guarded by
 * middleware.ts, so by the time this renders a valid session exists.
 *
 * PURPOSE:
 * Reads the session cookie server-side to get the buyer's display
 * name/email, then renders the buyer account shell (BuyerNav + page
 * content). This is where buyer-area chrome lives — never inside
 * individual pages, per the Next.js account-layout convention this
 * project already follows for superAdmin.
 *
 * DATA FLOW:
 * 1. Read the sb-access-token HttpOnly cookie (Server Component only
 *    — cookies() is not available to Client Components).
 * 2. Resolve the Supabase user from that token via the admin client
 *    (same lookup middleware.ts already does for route protection).
 * 3. Pass the display name/email down to the client-side BuyerNav,
 *    which owns the interactive Sign Out button.
 */
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { supabaseAdminClient } from "@/lib/supabase/serverClient";
import BuyerNav from "@/components/buyer/BuyerNav";
import "../styles/buyerDashboard.css";

export default async function BuyerLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  const { data } = accessToken
    ? await supabaseAdminClient.auth.getUser(accessToken)
    : { data: { user: null } };

  const displayName =
    (data.user?.user_metadata?.fullName as string | undefined) ??
    data.user?.email ??
    "there";

  return (
    <div className="buyerShell">
      <BuyerNav displayName={displayName} />
      <main className="buyerMain">{children}</main>
    </div>
  );
}
