/**
 * FILE: app/(public)/auth/login/page.tsx
 * ROLE: Public — Sign In / Create Account entry point, served at
 * "/auth/login". Linked from NavBar's "Sign Up" pill.
 *
 * PURPOSE:
 * Placeholder only. The full Sign In / Create Account experience
 * (tabbed form, Supabase auth, password strength meter, API routes)
 * is specced in login_and_registration_page.md but deliberately not
 * built yet — the person asked for the link + a page to land on
 * first, full implementation later. Keeps the route real (no 404)
 * using shared.css's .eyebrow/.heroTitle/.heroSubtitle/.buttonPrimary
 * plus 3 small new classes (.authPlaceholder*) rather than a whole
 * new stylesheet for a page that's getting replaced anyway.
 *
 * DATA FLOW:
 * Static content only — no data fetching, no client-side state.
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In | Matthew Studio",
  description: "Sign in or create a Matthew Studio account.",
};

export default function AuthLoginPage() {
  return (
    <section className="authPlaceholderSection">
      <div className="authPlaceholderCard">
        <p className="eyebrow">Account</p>
        <h1 className="heroTitle">Sign in coming soon</h1>
        <p className="heroSubtitle">
          Account creation and sign-in are on the way. In the meantime, browse the
          marketplace — no account needed to look around.
        </p>
        <Link href="/products" className="buttonPrimary authPlaceholderCta">
          Browse All Products
        </Link>
      </div>
    </section>
  );
}
