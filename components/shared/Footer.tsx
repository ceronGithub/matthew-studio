/**
 * FILE: components/shared/Footer.tsx
 * ROLE: Public — rendered on every page via app/layout.tsx.
 *
 * PURPOSE:
 * Site-wide footer. Static content only — quick links, contact
 * shortcut, and copyright. No data fetching.
 */
import Link from "next/link";
import SocialLinks from "@/components/shared/SocialLinks";

const FOOTER_LINK_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Portfolio", href: "/portfolio" },
      { label: "Template Shop", href: "/shop" },
      { label: "Features", href: "/features" },
      { label: "How It Works", href: "/how-it-works" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Testimonials", href: "/testimonials" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="siteFooter">
      <div className="siteFooterInner">
        <div className="siteFooterBrand">
          <p className="siteFooterLogo">Matthew Studio</p>
          <p className="siteFooterTagline">
            Resort website templates with built-in booking, promos, and an admin dashboard —
            live in 48 hours.
          </p>
          <SocialLinks />
        </div>

        <div className="siteFooterColumns">
          {FOOTER_LINK_COLUMNS.map((column) => (
            <div key={column.heading} className="siteFooterColumn">
              <p className="siteFooterColumnHeading">{column.heading}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="siteFooterBottom">
        <p>© {currentYear} Matthew Studio. All rights reserved.</p>
      </div>
    </footer>
  );
}
