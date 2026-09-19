/**
 * FILE: components/products/ProductsGrid.tsx
 * ROLE: Public — interactive body of /products (search, category
 * filter, sort, and the resulting product grid).
 *
 * PURPOSE:
 * Shows the live, published products from the database (task-122).
 * A text search (matched against name + description), a category
 * filter (all 6 categories or "all"), a sort mode, and pagination are
 * all sent to GET /api/shop/products through useShopProducts — the
 * server does the filtering, so a product an admin publishes appears
 * here without a code change, and one moved back to pending review
 * disappears immediately. Reuses the existing ProductCard component
 * and .productCard / .productCardsGrid styles (shared.css) so cards
 * look identical to the ones on each homepage category section.
 *
 * DATA FLOW:
 * 1. useShopProducts owns the query state and the fetch.
 * 2. This component renders one of three states (Rule 25): a loading
 *    skeleton, an error with a retry button, or the results — with the
 *    empty-results message when the query matches nothing.
 * 3. Page buttons call goToPage; any filter change resets to page 1
 *    (handled inside the hook).
 */
"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import ProductCard from "@/components/home/ProductCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useShopProducts, type ShopSortMode } from "@/lib/hooks/useShopProducts";
import { FORBIDDEN_CHARACTERS } from "@/lib/adminProductValidation";

// Per-card stagger delay for the scroll-entrance animation — capped at
// 8 so a long results page doesn't push the last row's entrance out
// several seconds (visitor_specification.md §3.1).
const STAGGER_STEP_SECONDS = 0.06;
const STAGGER_CAP = 8;

// How many placeholder cards the loading skeleton shows.
const SKELETON_CARD_COUNT = 6;

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "templates", label: "Templates" },
  { value: "tshirts", label: "T-Shirts" },
  { value: "ai-videos", label: "AI Videos" },
  { value: "file-tools", label: "File Tools" },
  { value: "tutorials", label: "Tutorials" },
  { value: "game-characters", label: "Game Characters" },
];

const SORT_OPTIONS: { value: ShopSortMode; label: string }[] = [
  { value: "bestselling", label: "Bestselling" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

export default function ProductsGrid() {
  const {
    products,
    totalCount,
    totalPages,
    page,
    isLoading,
    error,
    search,
    category,
    sortMode,
    setSearch,
    setCategory,
    setSortMode,
    goToPage,
    refetch,
  } = useShopProducts();

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
              value={search}
              // Rule 18.1 — forbidden characters are silently stripped as they are typed.
              onChange={(event) => setSearch(event.target.value.replace(FORBIDDEN_CHARACTERS, ""))}
            />
          </div>

          <label className="productsSortSelect">
            <span className="srOnly">Sort by</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as ShopSortMode)}>
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

        {isLoading ? (
          // Loading state (Rule 25.2) — skeleton cards mirror the real card shape.
          <div className="productCardsGrid" aria-busy="true" aria-label="Loading products">
            {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
              <div key={index} className="productCardSkeleton">
                <div className="productCardSkeletonThumb skeletonBlock" />
                <div className="productCardSkeletonBody">
                  <div className="productCardSkeletonLine skeletonBlock" />
                  <div className="productCardSkeletonLine productCardSkeletonLine--short skeletonBlock" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state (Rule 25.4) — friendly message + retry.
          <div className="productsEmpty" role="alert">
            <p>{error}</p>
            <button type="button" className="buttonSecondary" onClick={refetch}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <p className="productsResultCount">
              {totalCount} {totalCount === 1 ? "product" : "products"}
            </p>

            {products.length === 0 ? (
              // Empty state (Rule 25.3) — action-specific message, never a blank grid.
              <p className="productsEmpty">
                No products match {search ? `"${search}"` : "this filter"} — try a different search term or
                category.
              </p>
            ) : (
              <div className="productCardsGrid">
                {products.map((product, index) => (
                  <ScrollReveal
                    key={product.id}
                    delay={Math.min(index, STAGGER_CAP) * STAGGER_STEP_SECONDS}
                  >
                    <ProductCard product={product} />
                  </ScrollReveal>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="productsPagination">
                <button
                  type="button"
                  className="productsPageButton"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="productsPageLabel">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="productsPageButton"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
