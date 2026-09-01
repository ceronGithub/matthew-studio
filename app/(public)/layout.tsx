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
      {/*
        Skip-to-content link (Rule 17.6 / IMPROVEMENTS.md Section 13
        accessibility checklist). Visually hidden by default via the
        .skipToContentLink class in shared.css; snaps into view at the
        top-left the moment it receives keyboard focus (first Tab press
        on the page), letting keyboard/screen-reader users jump straight
        past the nav links to the page's actual content.
      */}
      <a href="#mainContent" className="skipToContentLink">
        Skip to main content
      </a>
      <NavBar />
      <main id="mainContent" className="siteMain">
        {children}
      </main>
      <Footer />
    </>
  );
}
