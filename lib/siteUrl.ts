/**
 * FILE: lib/siteUrl.ts
 * ROLE: Shared helper — used by app/sitemap.ts and app/robots.ts.
 *
 * PURPOSE:
 * Returns the site's public origin (no trailing slash) so sitemap entries and
 * the robots.txt sitemap line are full URLs, which both formats require.
 * Reads APP_URL, the same variable the reset-password and create-admin emails
 * already use, so there is one setting for "where does this site live".
 *
 * DATA FLOW:
 * 1. APP_URL set -> used as is, minus any trailing slash.
 * 2. APP_URL missing -> falls back to http://localhost:3000 so local dev works.
 *    In production this must be set, or the sitemap will point at localhost.
 */
export function getSiteUrl(): string {
  const configuredUrl = process.env.APP_URL?.trim();
  const siteUrl = configuredUrl && configuredUrl.length > 0 ? configuredUrl : "http://localhost:3000";
  return siteUrl.replace(/\/+$/, "");
}
