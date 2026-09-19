/**
 * FILE: app/(public)/products/page.tsx
 * ROLE: Public — marketplace master grid, served at "/products".
 *
 * PURPOSE:
 * Single browsable grid of every product across all 6 marketplace
 * categories (Templates, T-Shirts, AI Videos, File Tools, Tutorials,
 * Game Characters), with search, category filter, and sort — per
 * improvement_1.md Section 4 ("/products — master grid (filter/sort/
 * search)"), now backed by the live Product table.
 *
 * DATA FLOW:
 * 1. This Server Component renders the page header and the Client
 *    Component ProductsGrid — it no longer reads the static PRODUCTS
 *    array (task-122).
 * 2. ProductsGrid fetches published products from GET
 *    /api/shop/products (via useShopProducts) and owns the
 *    search/filter/sort/page state.
 */
import type { Metadata } from "next";
import "../../styles/products.css";
import ProductsGrid from "@/components/products/ProductsGrid";

export const metadata: Metadata = {
  title: "All Products | Matthew Studio",
  description:
    "Browse every product in the Matthew Studio marketplace — templates, t-shirts, AI videos, file tools, tutorials, and game characters. Filter, sort, and search the full catalog.",
  openGraph: {
    title: "All Products | Matthew Studio",
    description:
      "Browse every product in the Matthew Studio marketplace — templates, t-shirts, AI videos, file tools, tutorials, and game characters. Filter, sort, and search the full catalog.",
    images: ["/og-home.png"],
  },
};

export default function ProductsPage() {
  return (
    <>
      <header className="productsPageHeader">
        <div className="productsPageHeaderInner">
          <p className="eyebrow">Full Catalog</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            All products
          </h1>
          <p className="heroSubtitle">
            Every template, t-shirt, AI video pack, file tool, tutorial, and game character
            we sell — in one place. Search, filter by category, or sort to find what you need.
          </p>
        </div>
      </header>

      <ProductsGrid />
    </>
  );
}
