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
import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";

// Categories column is generated from the same CATEGORY_SHOWCASE data the
// homepage grid uses — one source of truth, so the footer can never drift
// out of sync with the actual 6 marketplace categories (improvement_1.md
// Section 2: footer previously only listed old single-template pages).
const CATEGORY_LINKS = CATEGORY_SHOWCASE.map((category) => ({
  label: category.name,
  href: `/${category.slug}`,
}));

const FOOTER_LINK_COLUMNS = [
  {
    heading: "Categories",
    links: CATEGORY_LINKS,
  },
  {
    heading: "Product",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Pricing", href: "/pricing" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Features", href: "/features" },
      { label: "How It Works", href: "/how-it-works" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Security", href: "/security" },
      { label: "Refund Policy", href: "/refund-policy" },
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
            A digital marketplace for website templates, t-shirts, AI videos, file tools,
            tutorials, and game characters — ready to use, built to launch fast.
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
