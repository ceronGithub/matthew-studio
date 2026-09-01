/**
 * FILE: app/(public)/portfolio/page.tsx
 * ROLE: Public — retired route, served at "/portfolio".
 *
 * PURPOSE:
 * "/portfolio" is rebranded to "/case-studies" per improvement_1.md
 * Section 3/5. This route stays in place only so old bookmarks/links
 * redirect instead of 404ing — all new links across the site now
 * point straight to "/case-studies" (see Footer, TestimonialGrid,
 * /shop→/pricing note, and /testimonials).
 *
 * DATA FLOW:
 * No content rendered — redirect() throws immediately on request,
 * before any component body executes.
 */
import { redirect } from "next/navigation";

export default function PortfolioPage() {
  redirect("/case-studies");
}
