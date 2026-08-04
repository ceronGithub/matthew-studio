/**
 * FILE: app/(public)/layout.tsx
 * ROLE: Public — wraps every public-facing page (Home, Portfolio, Shop,
 * Features, How It Works, Testimonials, Contact). Never wraps
 * app/superAdmin — that area defines its own shell in its own layout.
 *
 * PURPOSE:
 * Renders the site-wide NavBar and Footer around the page content.
 * Kept out of the true root layout (app/layout.tsx) so the admin
 * area doesn't inherit public marketing chrome.
 */
import "../styles/shared.css";
import NavBar from "@/components/shared/NavBar";
import Footer from "@/components/shared/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="siteMain">{children}</main>
      <Footer />
    </>
  );
}
