/**
 * FILE: components/shared/NavBar.tsx
 * ROLE: Public — rendered on every page via app/layout.tsx.
 *
 * PURPOSE:
 * Site-wide top navigation. Highlights the active route, and collapses
 * into a slide-down mobile menu below the tablet breakpoint. Does not
 * fetch any data — links are static site routes.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * NAV_LINKS
 * Per IMPROVEMENTS.md Section 8. Testimonials and How It Works are
 * in-page anchors on the homepage — the leading "/" makes them
 * navigate home first (from any other route) before scrolling.
 * anchorId is set only for links that should track scroll position
 * for the active-state highlight below.
 */
const NAV_LINKS = [
  { label: "Home", href: "/", anchorId: null },
  { label: "Testimonials", href: "/#testimonials-section", anchorId: "testimonials-section" },
  { label: "Support", href: "/support", anchorId: null },
  { label: "How It Works", href: "/#how-it-works-section", anchorId: "how-it-works-section" },
  { label: "Shop", href: "/shop", anchorId: null },
];

export default function NavBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Tracks which in-page section is currently in view, so the anchor
  // links can highlight as active while scrolling the homepage —
  // pathname alone never changes for hash links, so this fills the gap.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Only the homepage has the sections these anchors point to, so the
  // observer is only worth attaching there — it responds to whichever
  // tracked section crosses the middle of the viewport.
  useEffect(() => {
    if (pathname !== "/") {
      setActiveSectionId(null);
      return;
    }

    const trackedIds = NAV_LINKS.filter((link) => link.anchorId).map((link) => link.anchorId as string);
    const elements = trackedIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSectionId(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" } // fires when a section crosses the viewport's vertical center
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header className="siteHeader">
      <nav className="siteNav" aria-label="Primary">
        <div className="siteNavInner">
          <Link href="/" className="siteLogo" onClick={() => setIsMenuOpen(false)}>
            Matthew Studio
          </Link>

          {/* Desktop link row — hidden below tablet breakpoint (mediaQueries.css) */}
          <ul className="siteNavLinks">
            {NAV_LINKS.map((link) => {
              // Anchor links are active when their section is in view;
              // page links (Home, Support, Shop) fall back to pathname —
              // but Home only counts as active once no section is in view,
              // so it doesn't stay highlighted while scrolled into Testimonials.
              const isActive = link.anchorId
                ? activeSectionId === link.anchorId
                : pathname === link.href && (link.href !== "/" || activeSectionId === null);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive ? "siteNavLink siteNavLinkActive" : "siteNavLink"}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link href="/shop" className="siteNavCta">
            Get a Demo
          </Link>

          {/* Mobile menu toggle — only visible below tablet breakpoint */}
          <button
            type="button"
            className="siteNavToggle"
            aria-expanded={isMenuOpen}
            aria-controls="mobileNavPanel"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
          </button>
        </div>

        {/* Mobile slide-down panel — animates open/closed via CSS max-height */}
        <div
          id="mobileNavPanel"
          className={isMenuOpen ? "siteNavMobilePanel siteNavMobilePanelOpen" : "siteNavMobilePanel"}
        >
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setIsMenuOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="siteNavCta siteNavCtaMobile" onClick={() => setIsMenuOpen(false)}>
                Get a Demo
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
