/**
 * FILE: app/(public)/pricing/page.tsx
 * ROLE: Public — Marketplace Pricing page, served at "/pricing".
 *
 * PURPOSE:
 * Replaces the old single-template "/shop" (Managed SaaS / Self-Hosted /
 * Custom Build tiers — Templates-only) with a marketplace-wide pricing
 * overview covering all 6 categories. Reuses CATEGORY_SHOWCASE (same
 * data already shown on the homepage's CategoryShowcase section) so the
 * starting prices quoted here never contradict what visitors already
 * saw on the homepage. Templates still has a deeper 3-tier pricing
 * model (Managed/Self-Hosted/Custom) — that stays on /features via
 * ComparisonTable rather than being duplicated here; this page links
 * out to it for visitors who need that level of detail.
 *
 * DATA FLOW:
 * 1. Server Component reads CATEGORY_SHOWCASE directly (static data,
 *    no fetch needed today).
 * 2. Each card links to its own category page (e.g. /templates,
 *    /tshirts) where the actual product list + per-item pricing lives.
 *
 * MOTION (visitor_specification.md §3.1, §6, Implementation Order Step 3):
 * Header and closing note fade in on scroll via the shared ScrollReveal
 * primitive; the six category cards stagger in by 0.06s per index,
 * same cadence as /products and the homepage category grids. Card
 * hover-lift (translateY(-4px)) already lived in pricing.css before
 * this pass — only the entrance motion was missing.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutTemplate,
  Shirt,
  Clapperboard,
  Wrench,
  BookOpen,
  Box,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import "../../styles/pricing.css";
import { CATEGORY_SHOWCASE, type CategoryShowcaseItem } from "@/lib/categoryShowcaseData";
import ScrollReveal from "@/components/shared/ScrollReveal";

export const metadata: Metadata = {
  title: "Pricing | Matthew Studio",
  description:
    "See starting prices across every Matthew Studio category — Templates, T-Shirts, AI Videos, File Tools, Tutorials, and Game Characters — all in one marketplace.",
  openGraph: {
    title: "Pricing | Matthew Studio",
    description:
      "See starting prices across every Matthew Studio category — Templates, T-Shirts, AI Videos, File Tools, Tutorials, and Game Characters — all in one marketplace.",
    images: ["/og-pricing.png"],
  },
};

const CATEGORY_ICONS: Record<CategoryShowcaseItem["iconName"], LucideIcon> = {
  "layout-template": LayoutTemplate,
  shirt: Shirt,
  clapperboard: Clapperboard,
  wrench: Wrench,
  "book-open": BookOpen,
  box: Box,
};

export default function PricingPage() {
  return (
    <>
      <header className="pricingPageHeader">
        <ScrollReveal className="pricingPageHeaderInner">
          <p className="eyebrow">Pricing</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            One marketplace, six starting prices
          </h1>
          <p className="heroSubtitle">
            Every category is priced on its own terms — pick a category below to see the full
            product list and exact pricing per item.
          </p>
        </ScrollReveal>
      </header>

      <section className="categoryPricingSection">
        <div className="categoryPricingGrid">
          {CATEGORY_SHOWCASE.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.iconName];
            return (
              <ScrollReveal key={category.slug} delay={index * 0.06}>
                <article className="categoryPricingCard">
                  <span className="categoryPricingIconWrap">
                    <Icon size={32} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div className="categoryPricingBody">
                    <h2 className="categoryPricingName">{category.name}</h2>
                    <p className="categoryPricingPrice">{category.startingPrice}</p>
                    <p className="categoryPricingDescription">{category.description}</p>
                  </div>
                  <Link href={`/${category.slug}`} className="categoryPricingLink">
                    See {category.name} pricing
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <section className="pricingNoteSection">
        <ScrollReveal className="pricingNoteInner">
          <p className="pricingNoteText">
            Need Templates with a managed hosting plan, or a fully custom build? Templates has its
            own deeper Managed / Self-Hosted / Custom tier comparison.
          </p>
          <Link href="/features" className="buttonSecondary">
            Compare Template Tiers
          </Link>
        </ScrollReveal>
      </section>
    </>
  );
}