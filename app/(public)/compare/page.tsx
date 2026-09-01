/**
 * FILE: app/(public)/compare/page.tsx
 * ROLE: Public — marketplace-wide product comparison tool, served at
 * "/compare".
 *
 * PURPOSE:
 * Per improvement_1.md Section 4 ("/compare — variant comparison
 * tool"). Lets a visitor pick up to 3 products from any category and
 * compare them side by side. See ProductCompareTool.tsx for the
 * interactive picker + table.
 *
 * DATA FLOW:
 * 1. This Server Component reads PRODUCTS directly (no fetch needed —
 *    it's a local static array today, same pattern as /products).
 * 2. The full product list is passed as a prop into the Client
 *    Component ProductCompareTool, which owns all picker/comparison
 *    state.
 */
import type { Metadata } from "next";
import "../../styles/compare.css";
import ProductCompareTool from "@/components/compare/ProductCompareTool";
import { PRODUCTS } from "@/lib/productsData";

export const metadata: Metadata = {
  title: "Compare Products | Matthew Studio",
  description:
    "Pick up to 3 products from any category — templates, t-shirts, AI videos, file tools, tutorials, or game characters — and compare price, rating, and variants side by side.",
  openGraph: {
    title: "Compare Products | Matthew Studio",
    description:
      "Pick up to 3 products from any category and compare price, rating, and variants side by side.",
    images: ["/og-home.png"],
  },
};

export default function ComparePage() {
  return (
    <>
      <header className="comparePageHeader">
        <div className="comparePageHeaderInner">
          <p className="eyebrow">Compare</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Compare products side by side
          </h1>
          <p className="heroSubtitle">
            Add up to 3 products from any category and see price, rating, and variant options
            next to each other.
          </p>
        </div>
      </header>

      <ProductCompareTool products={PRODUCTS} />
    </>
  );
}
