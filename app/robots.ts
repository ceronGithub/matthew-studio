/**
 * FILE: app/robots.ts
 * ROLE: Public — served by Next.js at "/robots.txt".
 *
 * PURPOSE:
 * Tells search engines to crawl the public pages and stay out of the private
 * areas (sitewide_technical_seo_specification.md Section 4.1), and where to
 * find the sitemap. This only asks crawlers to stay away; it is not access
 * control. Buyer, admin and super-admin pages are protected by middleware.ts.
 *
 * DATA FLOW:
 * 1. Allow "/" for every crawler, then list the private path prefixes.
 * 2. The sitemap line is built from getSiteUrl() so it is a full URL.
 */
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

// Private or transactional areas that should never show up in search results.
const DISALLOWED_PATHS = [
  "/buyer/",
  "/admin/",
  "/superAdmin/",
  "/auth/",
  "/api/",
  "/checkout",
  "/order-confirmation/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
