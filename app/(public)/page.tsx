/**
 * FILE: app/(public)/page.tsx
 * ROLE: Public — Home/Landing page, served at "/".
 *
 * PURPOSE:
 * Introduces the resort booking template. Composed of two sections:
 * HeroSection (headline + CTAs) and QuickWins (client wordmarks +
 * result stats). Both sections are Client Components (framer-motion
 * entrance animation); this page itself stays a Server Component so
 * it can export static metadata for SEO.
 *
 * DATA FLOW:
 * No data fetching — all copy is static placeholder content pending
 * real client names, screenshots, and verified metrics.
 */
import type { Metadata } from "next";
import "../styles/home.css";
import HeroSection from "@/components/home/HeroSection";
import QuickWins from "@/components/home/QuickWins";
import CategoryShowcase from "@/components/home/CategoryShowcase";
import FeaturedProducts from "@/components/home/FeaturedProducts";

export const metadata: Metadata = {
  title: "Matthew Studio | Resort Booking Website Templates",
  description:
    "Production-ready resort website templates with multi-room booking, promos, and an admin dashboard — live in 48 hours.",
  openGraph: {
    title: "Matthew Studio | Resort Booking Website Templates",
    description:
      "Production-ready resort website templates with multi-room booking, promos, and an admin dashboard — live in 48 hours.",
    images: ["/og-home.png"],
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <QuickWins />
      <CategoryShowcase />
      <FeaturedProducts />
    </>
  );
}
