/**
 * FILE: app/(auth)/layout.tsx
 * ROLE: Auth route group — wraps /auth/login only.
 *
 * PURPOSE:
 * Strips the site NavBar/Footer for the auth flow (per
 * login_and_registration_page.md Section 3) and provides the
 * full-viewport wrapper the background slideshow and glass card sit
 * inside. No account-specific logic here — that lives in page.tsx.
 */
import type { ReactNode } from "react";
import "../styles/auth.css";
import "../styles/authBackground.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="authPageWrapper">{children}</main>;
}
