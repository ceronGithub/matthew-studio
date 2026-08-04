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
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Shop", href: "/shop" },
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
              const isActive = pathname === link.href;
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

          <Link href="/contact" className="siteNavCta">
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
              <Link href="/contact" className="siteNavCta siteNavCtaMobile" onClick={() => setIsMenuOpen(false)}>
                Get a Demo
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
