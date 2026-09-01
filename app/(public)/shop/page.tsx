/**
 * FILE: app/(public)/shop/page.tsx
 * ROLE: Public — retired route, served at "/shop".
 *
 * PURPOSE:
 * "/shop" was the old single-template pricing page (Managed SaaS /
 * Self-Hosted / Custom Build tiers, Templates-only) from before the
 * marketplace pivot. Per improvement_1.md Section 3/5, it's retired
 * in favor of "/pricing" (marketplace-wide, all 6 categories). This
 * route stays in place only so old bookmarks/links redirect instead
 * of 404ing — all new links across the site now point straight to
 * "/pricing" (see NavBar, Footer, HeroSection, TemplatesSection,
 * CategoryShowcase, /features, /how-it-works).
 *
 * DATA FLOW:
 * No content rendered — redirect() throws immediately on request,
 * before any component body executes.
 */
import { redirect } from "next/navigation";

export default function ShopPage() {
  redirect("/pricing");
}
