/**
 * FILE: app/(public)/page.tsx
 * ROLE: Public — Home/Landing page, served at "/".
 *
 * PURPOSE:
 * Introduces the Matthew Studio digital marketplace — Templates,
 * T-Shirts, AI Videos, File Tools, Tutorials, and Game Characters —
 * via HeroSection, QuickWins, CategoryShowcase, FeaturedProducts, and
 * one dedicated section per category. Section components are Client
 * Components (framer-motion entrance animation); this page itself
 * stays a Server Component so it can export static metadata for SEO.
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
import TemplatesSection from "@/components/home/TemplatesSection";
import TShirtsSection from "@/components/home/TShirtsSection";
import AIVideosSection from "@/components/home/AIVideosSection";
import FileToolsSection from "@/components/home/FileToolsSection";
import TutorialsSection from "@/components/home/TutorialsSection";
import GameCharactersSection from "@/components/home/GameCharactersSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import FAQAccordion from "@/components/home/FAQAccordion";
import CTABanner from "@/components/home/CTABanner";

export const metadata: Metadata = {
  title: "Matthew Studio | Templates, T-Shirts, AI Videos & Digital Products",
  description:
    "A digital marketplace for website templates, custom t-shirts, AI-generated videos, file tools, tutorials, and game characters — ready to use, built to launch fast.",
  openGraph: {
    title: "Matthew Studio | Templates, T-Shirts, AI Videos & Digital Products",
    description:
      "A digital marketplace for website templates, custom t-shirts, AI-generated videos, file tools, tutorials, and game characters — ready to use, built to launch fast.",
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
      <TemplatesSection />
      <TShirtsSection />
      <AIVideosSection />
      <FileToolsSection />
      <TutorialsSection />
      <GameCharactersSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FAQAccordion />
      <CTABanner />
    </>
  );
}
