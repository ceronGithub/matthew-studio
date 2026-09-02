/**
 * FILE: components/buyer/BuyerNav.tsx
 * ROLE: Buyer — top bar shown on every /buyer/* page.
 *
 * PURPOSE:
 * Shows the wordmark, a welcome-back label, and the Sign Out button.
 * Sign Out calls /api/auth/logout to expire the session cookies, then
 * sends the browser to /auth/login — never a client-side-only redirect
 * without hitting the logout endpoint first (Rule 44).
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

interface BuyerNavProps {
  displayName: string;
}

export default function BuyerNav({ displayName }: BuyerNavProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Ends the session server-side first (cookie expiry is the real logout
  // step), then navigates — never the other way around.
  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/auth/login");
    }
  }

  return (
    <header className="buyerNav">
      <div className="buyerNavInner">
        <Link href="/buyer/dashboard" className="buyerNavWordmark">
          Matthew Studio
        </Link>

        <div className="buyerNavRight">
          <span className="buyerNavWelcome">Hi, {displayName}</span>
          <button
            type="button"
            className="buyerNavSignOut"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? <Loader2 size={16} className="buyerSpin" /> : <LogOut size={16} />}
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
