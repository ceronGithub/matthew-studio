/**
 * FILE: app/(public)/shop/page.tsx
 * ROLE: Public — Template Shop page, served at "/shop".
 *
 * PURPOSE:
 * Presents the three pricing tiers (Managed SaaS, Self-Hosted, Custom
 * Build) via PricingGrid, plus a short reassurance note below the
 * grid. Data is static placeholder content from lib/pricingData.ts
 * pending superAdmin-managed pricing.
 *
 * DATA FLOW:
 * 1. This Server Component reads PRICING_TIERS directly (no fetch
 *    needed — it's a local static array today).
 * 2. Tiers are passed as props into the Client Component PricingGrid,
 *    which handles the entrance animations and CTA links.
 */
import type { Metadata } from "next";
import Link from "next/link";
import "../../styles/shop.css";
import PricingGrid from "@/components/shop/PricingGrid";
import { PRICING_TIERS } from "@/lib/pricingData";

export const metadata: Metadata = {
  title: "Template Shop | Matthew Studio",
  description:
    "Three ways to get a resort booking website live: managed SaaS, self-hosted, or a custom build. Compare pricing and pick a tier.",
  openGraph: {
    title: "Template Shop | Matthew Studio",
    description:
      "Three ways to get a resort booking website live: managed SaaS, self-hosted, or a custom build. Compare pricing and pick a tier.",
    images: ["/og-shop.png"],
  },
};

export default function ShopPage() {
  return (
    <>
      <header className="shopPageHeader">
        <div className="shopPageHeaderInner">
          <p className="eyebrow">Template Shop</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Pick how you want to launch
          </h1>
          <p className="heroSubtitle">
            Every tier ships with multi-room booking, promos, and an admin dashboard. The
            difference is how much control — and how much we handle for you.
          </p>
        </div>
      </header>

      <PricingGrid tiers={PRICING_TIERS} />

      <section className="shopNoteSection">
        <div className="shopNoteInner">
          <p className="shopNoteText">
            Not sure which tier fits your resort? See how each one performed for a real property.
          </p>
          <Link href="/portfolio" className="buttonSecondary">
            View Case Studies
          </Link>
        </div>
      </section>
    </>
  );
}
