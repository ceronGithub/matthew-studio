/**
 * FILE: app/not-found.tsx
 * ROLE: Public — root 404 page (Rule 31.10). Shown for any URL that
 * matches no route, and for notFound() calls in segments without their
 * own not-found.tsx. The per-product [slug]/not-found.tsx files still
 * take priority for their own routes.
 *
 * PURPOSE:
 * Replaces Next.js's unstyled default 404 with a branded page: a short
 * message, a button to the shop, and shortcuts to the six product
 * categories so a mistyped link still leads somewhere useful.
 *
 * DATA FLOW:
 * Server Component, no fetching. The category list comes from
 * lib/categoryShowcaseData.ts (the same list the homepage grid uses),
 * and each slug is also the category's public route (/templates, /tshirts, ...).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";
import "./styles/errorPages.css";

export const metadata: Metadata = {
  title: "Page not found | Matthew Studio",
};

export default function NotFound() {
  return (
    <section className="errorPage">
      <div className="errorPageInner">
        <p className="errorPageEyebrow">404</p>
        <h1 className="errorPageTitle">We couldn&apos;t find that page</h1>
        <p className="errorPageMessage">
          The link may be mistyped, or the page may have moved or been removed. Head to the
          shop, or jump straight to a category below.
        </p>
        <div className="errorPageActions">
          <Link href="/shop" className="errorPageButtonPrimary">
            Browse the shop
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link href="/" className="errorPageButtonSecondary">
            <Home size={18} strokeWidth={1.75} aria-hidden="true" />
            Back to homepage
          </Link>
        </div>

        <nav className="errorPageCategories" aria-label="Browse by category">
          <p className="errorPageCategoriesLabel">Or browse a category</p>
          <ul className="errorPageCategoryList">
            {CATEGORY_SHOWCASE.map((category) => (
              <li key={category.slug}>
                <Link href={`/${category.slug}`} className="errorPageCategoryLink">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
