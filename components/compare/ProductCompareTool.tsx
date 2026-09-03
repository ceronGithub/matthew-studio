/**
 * FILE: components/compare/ProductCompareTool.tsx
 * ROLE: Public — interactive body of /compare, the marketplace-wide
 * variant comparison tool from improvement_1.md Section 4
 * ("/compare — variant comparison tool").
 *
 * PURPOSE:
 * Lets a visitor pick up to 3 products from the full catalog (any of
 * the 6 categories, not just Templates) and see them side by side —
 * category, rating, starting price, badge, and description. For
 * Templates products specifically, which are the only ones with a
 * `variants` breakdown (Static/Dynamic/Modern, per
 * lib/productsData.ts), each variant is also listed with its own
 * price so a visitor comparing two Templates products can see their
 * variant options at the same time, not just the flagship price.
 *
 * DATA FLOW:
 * Receives the full Product[] as a prop from the Server Component
 * page (no fetch — static data, same pattern as ProductsGrid). All
 * picking/removing happens client-side with useState; nothing is
 * persisted or sent anywhere. Each of the 3 slots has its own search
 * query so a visitor can look up all 3 products independently.
 *
 * MOTION (visitor_specification.md §3.1, §6):
 * The slot-picker grid uses the shared ScrollReveal primitive (section-
 * level entrance, mandatory per §3.1). The comparison table's rows use
 * `motion.tr` directly (not ScrollReveal's div wrapper, which is invalid
 * HTML inside a <tbody>) with the same stagger cadence and reduced-motion
 * handling. Rows animate in once, the moment the table first mounts
 * (2+ products picked) — not re-triggered by removing/re-adding a slot,
 * since `viewport={{ once: true }}` only fires while the row is actually
 * new to the DOM.
 */
"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, X, Star } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import type { Product } from "@/lib/productsData";
import ScrollReveal from "@/components/shared/ScrollReveal";

const SLOT_COUNT = 3;

const BADGE_LABELS: Record<NonNullable<Product["badge"]>, string> = {
  bestseller: "Bestseller",
  new: "New",
  limited: "Limited",
};

interface SlotPickerProps {
  slotIndex: number;
  products: Product[];
  excludedIds: string[];
  onPick: (product: Product) => void;
}

/**
 * SlotPicker
 * Renders one empty comparison slot: a search input that filters the
 * full catalog by name/description as the visitor types, plus a
 * dropdown of up to 6 matches to choose from. Already-selected
 * products (in another slot) are excluded so the same product can't
 * fill two slots at once.
 */
function SlotPicker({ slotIndex, products, excludedIds, onPick }: SlotPickerProps) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) return [];

    return products
      .filter(
        (product) =>
          !excludedIds.includes(product.id) &&
          (product.name.toLowerCase().includes(trimmed) ||
            product.description.toLowerCase().includes(trimmed) ||
            product.categoryLabel.toLowerCase().includes(trimmed))
      )
      .slice(0, 6);
  }, [products, query, excludedIds]);

  return (
    <div className="compareSlot compareSlotEmpty">
      <p className="compareSlotEmptyLabel">Product {slotIndex + 1}</p>
      <div className="compareSlotSearchBar">
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search to add a product…"
          aria-label={`Search for product ${slotIndex + 1} to compare`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {query.trim().length > 0 && (
        <ul className="compareSlotResults">
          {matches.length === 0 ? (
            <li className="compareSlotResultsEmpty">No matching products.</li>
          ) : (
            matches.map((product) => {
              const Icon = CATEGORY_ICONS[product.iconName];
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    className="compareSlotResultItem"
                    onClick={() => {
                      onPick(product);
                      setQuery("");
                    }}
                  >
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>
                      <span className="compareSlotResultName">{product.name}</span>
                      <span className="compareSlotResultCategory">{product.categoryLabel}</span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export default function ProductCompareTool({ products }: { products: Product[] }) {
  // Respect the user's OS-level reduced-motion preference for the table
  // rows below — same pattern ScrollReveal uses internally, applied
  // directly here since motion.tr can't be wrapped in ScrollReveal's div.
  const prefersReducedMotion = useReducedMotion();

  // One slot per column — null means that slot is still empty and
  // shows the SlotPicker instead of a filled comparison column.
  const [selected, setSelected] = useState<(Product | null)[]>(
    Array.from({ length: SLOT_COUNT }, () => null)
  );

  const selectedIds = selected.filter((product): product is Product => product !== null).map((p) => p.id);
  const filledProducts = selected.filter((product): product is Product => product !== null);

  function handlePick(slotIndex: number, product: Product) {
    setSelected((previous) => {
      const next = [...previous];
      next[slotIndex] = product;
      return next;
    });
  }

  function handleRemove(slotIndex: number) {
    setSelected((previous) => {
      const next = [...previous];
      next[slotIndex] = null;
      return next;
    });
  }

  // Row labels shown down the left side of the comparison table —
  // "Variants" is only rendered as a row further down if at least one
  // selected product actually has variants (Templates-only field).
  const hasAnyVariants = filledProducts.some((product) => product.variants && product.variants.length > 0);

  // Assigns each <tr> a fade+slide-up entrance, staggered 0.06s per row
  // (same cadence as the product grids), dropping the translateY when
  // the visitor has reduced motion turned on — mirrors ScrollReveal's
  // own animation values without needing its (invalid-inside-a-table) div.
  let rowIndex = -1;
  function nextRowMotion() {
    rowIndex += 1;
    return {
      initial: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-40px" },
      transition: { duration: 0.4, delay: rowIndex * 0.06, ease: [0.22, 1, 0.36, 1] as const },
    };
  }

  return (
    <section className="compareSection">
      <div className="compareSectionInner">
        <ScrollReveal className="compareSlotsGrid">
          {selected.map((product, index) =>
            product ? (
              <div key={product.id} className="compareSlot compareSlotFilled">
                <button
                  type="button"
                  className="compareSlotRemove"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove ${product.name} from comparison`}
                >
                  <X size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                {(() => {
                  const Icon = CATEGORY_ICONS[product.iconName];
                  return <Icon size={32} strokeWidth={1.5} className="compareSlotIcon" aria-hidden="true" />;
                })()}
                <p className="compareSlotName">{product.name}</p>
                <p className="compareSlotCategory">{product.categoryLabel}</p>
              </div>
            ) : (
              <SlotPicker
                key={`empty-${index}`}
                slotIndex={index}
                products={products}
                excludedIds={selectedIds}
                onPick={(picked) => handlePick(index, picked)}
              />
            )
          )}
        </ScrollReveal>

        {filledProducts.length < 2 ? (
          <p className="compareEmptyState">
            Add at least 2 products above to see a side-by-side comparison.
          </p>
        ) : (
          <div className="compareTableWrapper">
            <table className="compareTable">
              <thead>
                <tr>
                  <th scope="col" className="compareTableRowLabel">
                    <span className="srOnly">Attribute</span>
                  </th>
                  {filledProducts.map((product) => (
                    <th key={product.id} scope="col">
                      {product.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <motion.tr {...nextRowMotion()}>
                  <th scope="row" className="compareTableRowLabel">
                    Category
                  </th>
                  {filledProducts.map((product) => (
                    <td key={product.id}>{product.categoryLabel}</td>
                  ))}
                </motion.tr>
                <motion.tr {...nextRowMotion()}>
                  <th scope="row" className="compareTableRowLabel">
                    Rating
                  </th>
                  {filledProducts.map((product) => (
                    <td key={product.id}>
                      <span className="compareTableRating">
                        <Star size={13} strokeWidth={0} fill="currentColor" aria-hidden="true" />
                        {product.rating.average.toFixed(1)}/5 · {product.rating.count} reviews
                      </span>
                    </td>
                  ))}
                </motion.tr>
                <motion.tr {...nextRowMotion()}>
                  <th scope="row" className="compareTableRowLabel">
                    Starting Price
                  </th>
                  {filledProducts.map((product) => (
                    <td key={product.id} className="compareTablePrice">
                      ₱{product.price.startingPrice.toLocaleString("en-PH")}
                      {product.price.managed ? "/mo" : ""}
                    </td>
                  ))}
                </motion.tr>
                <motion.tr {...nextRowMotion()}>
                  <th scope="row" className="compareTableRowLabel">
                    Badge
                  </th>
                  {filledProducts.map((product) => (
                    <td key={product.id}>
                      {product.badge ? (
                        <span className="compareTableBadge">{BADGE_LABELS[product.badge]}</span>
                      ) : (
                        <span className="compareTableDash" aria-label="None">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </motion.tr>
                <motion.tr {...nextRowMotion()}>
                  <th scope="row" className="compareTableRowLabel">
                    Description
                  </th>
                  {filledProducts.map((product) => (
                    <td key={product.id} className="compareTableDescription">
                      {product.description}
                    </td>
                  ))}
                </motion.tr>
                {hasAnyVariants && (
                  <motion.tr {...nextRowMotion()}>
                    <th scope="row" className="compareTableRowLabel">
                      Variants
                    </th>
                    {filledProducts.map((product) => (
                      <td key={product.id}>
                        {product.variants && product.variants.length > 0 ? (
                          <ul className="compareTableVariantList">
                            {product.variants.map((variant) => (
                              <li key={variant.name}>
                                <span className="compareTableVariantName">{variant.name}</span>
                                {variant.pricing && (
                                  <span className="compareTableVariantPrice">
                                    ₱{variant.pricing.managed.toLocaleString("en-PH")}/mo
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="compareTableDash" aria-label="No variants">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </motion.tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
