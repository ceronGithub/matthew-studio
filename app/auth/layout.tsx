/**
 * FILE: app/auth/layout.tsx
 * ROLE: Wraps every page under /auth/* — login, forgot-password,
 * reset-password.
 *
 * PURPOSE:
 * Strips the site NavBar/Footer for the auth flow (per
 * login_and_registration_page.md Section 3) and provides the
 * full-viewport wrapper the background slideshow and glass card sit
 * inside. No account-specific logic here — that lives in each page.tsx.
 *
 * NOTE: this was previously app/(auth)/ — a route group, which Next.js
 * strips from the URL. That made every "/auth/login" reference in
 * middleware.ts, SignInForm, and BuyerNav point at a page that was
 * actually served at "/login", a 404. Renamed to a real "auth" segment
 * so the URLs the rest of the app already expects actually resolve.
 */
import type { ReactNode } from "react";
import "../styles/auth.css";
import "../styles/authBackground.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="authPageWrapper">{children}</main>;
}
