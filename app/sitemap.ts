/**
 * FILE: app/sitemap.ts
 * ROLE: Public — served by Next.js at "/sitemap.xml".
 *
 * PURPOSE:
 * Lists every public page so search engines can find them: the static pages,
 * every published product page across the six categories, and every blog post
 * (sitewide_technical_seo_specification.md Section 4.1). Buyer, admin,
 * super-admin, auth, API, checkout and order-confirmation URLs are never
 * listed.
 *
 * DATA FLOW:
 * 1. Static page paths come from the list below.
 * 2. Products are read from the database: published, not soft-deleted
 *    (same filter as the public product pages). lastModified = updatedAt.
 * 3. Blog posts come from lib/blogData.ts. lastModified is parsed from the
 *    post's publishedAt text and skipped if it is not a valid date.
 * 4. Every URL is keyed by its full address so a page found twice is listed
 *    once (e.g. the Bulk File Converter product and its static tool page).
 * 5. If the database read fails, the sitemap still returns the static and
 *    blog URLs instead of an error page.
 */
import type { MetadataRoute } from "next";
import { prisma } from "@/services/prisma";
import { BLOG_POSTS } from "@/lib/blogData";
import { getSiteUrl } from "@/lib/siteUrl";

// Products can be published or unpublished at any time, so this is built
// per request, never frozen at build time (Rule 31.3).
export const dynamic = "force-dynamic";

// Public pages with no changing data behind them. Home is the empty string.
// The Bulk File Converter tool page (task-49i) is listed here so it is found
// even when its product row is not in the database; the product entry for the
// same URL replaces this one, because URLs are de-duplicated below.
const STATIC_PUBLIC_PATHS = [
  "",
  "/about",
  "/ai-videos",
  "/blog",
  "/compare",
  "/contact",
  "/faq",
  "/features",
  "/file-tools",
  "/file-tools/bulk-file-converter",
  "/game-characters",
  "/how-it-works",
  "/pricing",
  "/privacy",
  "/products",
  "/refund-policy",
  "/security",
  "/shop",
  "/support",
  "/templates",
  "/terms",
  "/testimonials",
  "/tshirts",
  "/tutorials",
];

/**
 * getProductEntries
 * Reads every published, non-deleted product and turns it into a sitemap
 * entry at /<category>/<slug>. Returns an empty list (never throws) if the
 * database cannot be read, so one database problem cannot take the whole
 * sitemap down.
 */
async function getProductEntries(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const publishedProducts = await prisma.product.findMany({
      where: { status: "published", deletedAt: null },
      select: { slug: true, category: true, updatedAt: true },
    });

    return publishedProducts.map((product) => ({
      url: `${siteUrl}/${product.category}/${product.slug}`,
      lastModified: product.updatedAt,
    }));
  } catch (error) {
    // Intentional production log: tells the site owner the product part of the
    // sitemap came back empty because of a database error, not because there
    // are no products.
    console.error("[sitemap] Could not read products:", error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * getBlogEntries
 * Turns each blog post into a sitemap entry at /blog/<slug>. publishedAt is a
 * display string like "Aug 22, 2026", so lastModified is only set when it
 * parses to a real date.
 */
function getBlogEntries(siteUrl: string): MetadataRoute.Sitemap {
  return BLOG_POSTS.map((post) => {
    const publishedDate = new Date(post.publishedAt);
    const hasValidDate = !Number.isNaN(publishedDate.getTime());

    return {
      url: `${siteUrl}/blog/${post.slug}`,
      ...(hasValidDate ? { lastModified: publishedDate } : {}),
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
  }));

  const productEntries = await getProductEntries(siteUrl);
  const blogEntries = getBlogEntries(siteUrl);

  // Keyed by URL so each address is listed once. Later entries win, so a
  // product's real updatedAt replaces a static entry that has no date.
  const entriesByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of [...staticEntries, ...blogEntries, ...productEntries]) {
    entriesByUrl.set(entry.url, entry);
  }

  return Array.from(entriesByUrl.values());
}
