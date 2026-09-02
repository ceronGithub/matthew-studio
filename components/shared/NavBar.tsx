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
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

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
  // /products (marketplace master grid) is now the catalog entry point;
  // "Shop" (old single-template pricing page) is repointed here per
  // improvement_1.md Section 4/5.
  { label: "Products", href: "/products", anchorId: null },
];

// LEGAL_LINKS — previously footer-only; now also reachable from the
// navbar (grouped under a "Legal" dropdown so 4 extra items don't
// clutter the top-level link row).
const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Refund Policy", href: "/refund-policy" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Desktop "Legal" dropdown open/closed state.
  const [isLegalMenuOpen, setIsLegalMenuOpen] = useState(false);
  const legalMenuRef = useRef<HTMLLIElement>(null);

  // Closes the Legal dropdown when a click lands outside it, and on
  // route change — otherwise it would stay open after navigating.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (legalMenuRef.current && !legalMenuRef.current.contains(event.target as Node)) {
        setIsLegalMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setIsLegalMenuOpen(false);
  }, [pathname]);
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

    // Tracks which tracked sections are currently inside the viewport's
    // center band. IntersectionObserver reports both enter and exit
    // events, so this set (not just the latest batch) always reflects
    // current state. When nothing is intersecting (scrolled above the
    // first section or below the last one), activeSectionId resets to
    // null instead of staying stuck on whichever section was last seen.
    const intersectingIds = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            intersectingIds.add(entry.target.id);
          } else {
            intersectingIds.delete(entry.target.id);
          }
        });

        const currentId = trackedIds.find((id) => intersectingIds.has(id)) ?? null;
        setActiveSectionId(currentId);
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

            {/* Legal dropdown — click-toggled, closes on outside click or route change */}
            <li className="siteNavDropdown" ref={legalMenuRef}>
              <button
                type="button"
                className={
                  isLegalMenuOpen
                    ? "siteNavLink siteNavDropdownTrigger siteNavDropdownTriggerOpen"
                    : "siteNavLink siteNavDropdownTrigger"
                }
                aria-expanded={isLegalMenuOpen}
                aria-haspopup="true"
                onClick={() => setIsLegalMenuOpen((open) => !open)}
              >
                Legal
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <ul
                className={
                  isLegalMenuOpen
                    ? "siteNavDropdownPanel siteNavDropdownPanelOpen"
                    : "siteNavDropdownPanel"
                }
              >
                {LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={() => setIsLegalMenuOpen(false)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>

          <Link href="/products" className="siteNavCta">
            Browse Marketplace
          </Link>

          {/* Light/dark theme toggle — hidden below tablet breakpoint
              alongside the rest of the desktop nav row; the mobile
              equivalent lives inside the slide-down panel below. */}
          <ThemeToggle className="siteNavThemeToggle" />

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

            {/* Legal links, grouped under a small heading — mobile has no
                hover/click dropdown, so they're listed flat instead. */}
            <li className="siteNavMobileGroupLabel" aria-hidden="true">
              Legal
            </li>
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setIsMenuOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}

            <li>
              <Link href="/products" className="siteNavCta siteNavCtaMobile" onClick={() => setIsMenuOpen(false)}>
                Browse Marketplace
              </Link>
            </li>
            <li className="siteNavMobileThemeRow">
              <ThemeToggle className="siteNavThemeToggleMobile" />
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}