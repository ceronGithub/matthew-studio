/**
 * FILE: components/shared/RoleAreaHeader.tsx
 * ROLE: Shared — used by app/admin/layout.tsx and app/superAdmin/layout.tsx
 * only (buyer has its own richer BuyerNav with wordmark + links).
 *
 * PURPOSE:
 * Minimal top bar for the placeholder admin/super-admin dashboards:
 * shows who's signed in and which area they're in, plus Sign Out.
 * Placeholder-scoped on purpose — once admin_account_specification.md
 * and super_admin_account_specification.md's real pages get built,
 * this gets replaced by proper per-area nav (sidebar, section links)
 * the same way BuyerNav serves /buyer/*.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { getCsrfHeader } from "@/lib/csrf";

interface RoleAreaHeaderProps {
  displayName: string;
  roleLabel: string; // "Admin" | "Super-Admin"
}

export default function RoleAreaHeader({ displayName, roleLabel }: RoleAreaHeaderProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Same pattern as BuyerNav's handleSignOut — end the session
  // server-side first (cookie expiry is the real logout step, Rule
  // 44), then navigate, regardless of whether the request succeeded.
  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: getCsrfHeader() });
    } finally {
      router.push("/auth/login");
    }
  }

  return (
    <header className="roleAreaNav">
      <div className="roleAreaNavInner">
        <span className="roleAreaNavLabel">{roleLabel}</span>
        <div className="roleAreaNavRight">
          <span className="roleAreaNavWelcome">{displayName}</span>
          <button
            type="button"
            className="roleAreaNavSignOut"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? <Loader2 size={16} className="authSpinner" /> : <LogOut size={16} />}
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
