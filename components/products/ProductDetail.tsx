/**
 * FILE: components/products/ProductDetail.tsx
 * ROLE: Public — shared body for every "/[category]/[slug]" product
 * detail page (improvement_1.md Section 4: "Product detail pages per
 * category ([slug], variant selectors)").
 *
 * PURPOSE:
 * Renders a single Product from lib/productsData.ts: breadcrumb back
 * to its category, icon thumb, rating, price, description, and a
 * "Get Started" CTA into /contact pre-filled with the category. For
 * Templates products that carry a `variants` breakdown (Static/
 * Dynamic/Modern), a variant selector lets the visitor switch between
 * them and see each variant's own managed/self-hosted price update
 * live — every other category has a single flat price and skips the
 * selector entirely. A "More in this category" strip links back out
 * to sibling products so a visitor isn't stuck at a dead end.
 *
 * DATA FLOW:
 * Receives the resolved Product and its category siblings as props
 * from the Server Component page (no fetch — static data, same
 * pattern as ProductsGrid/ProductCompareTool). Variant selection is
 * local useState only; nothing is persisted or sent anywhere yet —
 * there's no cart/checkout flow in this project.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import type { Product } from "@/lib/productsData";

interface ProductDetailProps {
  product: Product;
  /** Other products in the same category, for the "More in this category" strip. */
  siblings: Product[];
}

const BADGE_LABELS: Record<NonNullable<Product["badge"]>, string> = {
  bestseller: "Bestseller",
  new: "New",
  limited: "Limited",
};

export default function ProductDetail({ product, siblings }: ProductDetailProps) {
  const Icon = CATEGORY_ICONS[product.iconName];
  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  // Only Templates products carry a variants breakdown — default to
  // the first one (usually the entry-level option) when present.
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const selectedVariant = hasVariants ? product.variants![selectedVariantIndex] : null;

  // Price shown next to the title: the selected variant's managed price
  // when variants exist, otherwise the product's flat starting price.
  const displayPrice = selectedVariant
    ? selectedVariant.pricing?.managed ?? product.price.startingPrice
    : product.price.startingPrice;
  const isMonthly = Boolean(product.price.managed);

  return (
    <>
      <div className="productDetailPage">
        <div className="productDetailInner">
          <Link href={`/${product.category}`} className="productDetailBackLink">
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back to {product.categoryLabel}
          </Link>

          <div className="productDetailGrid">
            <div className="productDetailThumb">
              <Icon size={72} strokeWidth={1.25} aria-hidden="true" />
              {product.badge && (
                <span className="productCardBadge productDetailBadge">
                  {BADGE_LABELS[product.badge]}
                </span>
              )}
            </div>

            <div className="productDetailBody">
              <p className="eyebrow">{product.categoryLabel}</p>
              <h1 className="heroTitle productDetailTitle">{product.name}</h1>

              <p className="productDetailRating">
                <Star size={16} strokeWidth={0} fill="currentColor" aria-hidden="true" />
                {product.rating.average.toFixed(1)}/5 · {product.rating.count} reviews
              </p>

              <p className="heroSubtitle productDetailDescription">{product.description}</p>

              {/* Variant selector — Templates products only */}
              {hasVariants && (
                <div className="productDetailVariants">
                  <p className="productDetailVariantsLabel">Choose a variant</p>
                  <div className="productDetailVariantOptions">
                    {product.variants!.map((variant, index) => (
                      <button
                        key={variant.name}
                        type="button"
                        className={
                          index === selectedVariantIndex
                            ? "productDetailVariantOption productDetailVariantOptionActive"
                            : "productDetailVariantOption"
                        }
                        aria-pressed={index === selectedVariantIndex}
                        onClick={() => setSelectedVariantIndex(index)}
                      >
                        <span className="productDetailVariantName">{variant.name}</span>
                        <span className="productDetailVariantDescription">
                          {variant.description}
                        </span>
                        {variant.pricing && (
                          <span className="productDetailVariantPrice">
                            From ₱{variant.pricing.managed.toLocaleString("en-PH")}/mo
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedVariant?.designs && (
                    <p className="productDetailVariantDesigns">
                      Available designs: {selectedVariant.designs.join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="productDetailPriceRow">
                <p className="productDetailPrice">
                  From ₱{displayPrice.toLocaleString("en-PH")}
                  {isMonthly ? "/mo" : ""}
                </p>
                {selectedVariant?.pricing?.selfHosted && (
                  <p className="productDetailPriceAlt">
                    or ₱{selectedVariant.pricing.selfHosted.toLocaleString("en-PH")} self-hosted
                  </p>
                )}
                {!hasVariants && product.price.selfHosted && (
                  <p className="productDetailPriceAlt">
                    or ₱{product.price.selfHosted.toLocaleString("en-PH")} self-hosted
                  </p>
                )}
              </div>

              <div className="productDetailCtaRow">
                <Link
                  href={`/contact?category=${product.category}`}
                  className="buttonPrimary"
                >
                  Get Started
                </Link>
                <Link href="/compare" className="buttonSecondary">
                  Compare Products
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {siblings.length > 0 && (
        <div className="productDetailSiblings">
          <div className="productDetailSiblingsInner">
            <p className="sectionTitle productDetailSiblingsTitle">
              More in {product.categoryLabel}
            </p>
            <ul className="productDetailSiblingsList">
              {siblings.map((sibling) => (
                <li key={sibling.id}>
                  <Link
                    href={`/${sibling.category}/${sibling.slug}`}
                    className="productDetailSiblingLink"
                  >
                    {sibling.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
