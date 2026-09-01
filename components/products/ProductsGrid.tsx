/**
 * FILE: components/products/ProductsGrid.tsx
 * ROLE: Public — interactive body of /products (search, category
 * filter, sort, and the resulting product grid).
 *
 * PURPOSE:
 * Takes the full static PRODUCTS list and derives the visible subset
 * from three pieces of client state: a text search (matched against
 * name + description), a category filter (all 6 categories or "all"),
 * and a sort mode. Reuses the existing ProductCard component and
 * .productCard / .productCardsGrid styles (shared.css) so cards look
 * identical to the ones already shown in each homepage category
 * section — this page is a new way to browse the same catalog, not a
 * new visual language.
 *
 * DATA FLOW:
 * Receives the full Product[] as a prop from the Server Component
 * page (no fetch — static data). All filtering/sorting happens
 * client-side with useMemo; nothing is persisted or sent anywhere.
 */
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ProductCard from "@/components/home/ProductCard";
import type { Product, ProductCategorySlug } from "@/lib/productsData";

type CategoryFilter = ProductCategorySlug | "all";
type SortMode = "bestselling" | "newest" | "price-asc" | "price-desc" | "rating";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "templates", label: "Templates" },
  { value: "tshirts", label: "T-Shirts" },
  { value: "ai-videos", label: "AI Videos" },
  { value: "file-tools", label: "File Tools" },
  { value: "tutorials", label: "Tutorials" },
  { value: "game-characters", label: "Game Characters" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "bestselling", label: "Bestselling" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

function sortProducts(products: Product[], sortMode: SortMode): Product[] {
  const sorted = [...products];
  switch (sortMode) {
    case "newest":
      return sorted.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
    case "price-asc":
      return sorted.sort((a, b) => a.price.startingPrice - b.price.startingPrice);
    case "price-desc":
      return sorted.sort((a, b) => b.price.startingPrice - a.price.startingPrice);
    case "rating":
      return sorted.sort((a, b) => b.rating.average - a.rating.average);
    case "bestselling":
    default:
      return sorted.sort((a, b) => b.trendingScore - a.trendingScore);
  }
}

export default function ProductsGrid({ products }: { products: Product[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("bestselling");

  const visibleProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });

    return sortProducts(filtered, sortMode);
  }, [products, searchQuery, category, sortMode]);

  return (
    <section className="productsSection">
      <div className="productsSectionInner">
        <div className="productsControls">
          <div className="productsSearchBar">
            <Search size={18} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search products…"
              aria-label="Search products"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <label className="productsSortSelect">
            <span className="srOnly">Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="productsCategoryPills" role="group" aria-label="Filter by category">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={
                category === filter.value ? "productsCategoryPill productsCategoryPillActive" : "productsCategoryPill"
              }
              aria-pressed={category === filter.value}
              onClick={() => setCategory(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <p className="productsResultCount">
          {visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}
        </p>

        {visibleProducts.length === 0 ? (
          <p className="productsEmpty">
            No products match {searchQuery ? `"${searchQuery}"` : "this filter"} — try a different search term or
            category.
          </p>
        ) : (
          <div className="productCardsGrid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
