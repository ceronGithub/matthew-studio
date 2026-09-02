/**
 * FILE: components/home/ProductCard.tsx
 * ROLE: Public — reusable product tile used inside every category
 * section's "PRODUCT CARDS" block (IMPROVEMENTS.md Section 1, Section
 * Anatomy) and by Phase 2's per-category product grids.
 *
 * PURPOSE:
 * Renders a single product from lib/productsData.ts as a card:
 * category-tinted icon placeholder, name, star rating, starting
 * price, optional badge, and a "View Details" link into that
 * product's own detail page at "/[category]/[slug]" (see
 * components/products/ProductDetail.tsx). Kept separate from
 * FeaturedProducts.tsx's inline card (different data shape —
 * FeaturedProduct vs the fuller Product type) so it can be reused
 * as-is by the six Phase 2 sections without prop mismatches.
 *
 * `overlayTopLeft`/`overlayBottomRight` are optional slots rendered on
 * top of the thumb image, alongside the existing bestseller/new/
 * limited badge (which always sits top-right). Only TutorialsSection
 * uses these today, for its level badge (top-left) and duration
 * (bottom-right) — buyer_homepage_specification.md Section 3.9 calls
 * for the level badge top-right specifically, but several tutorial
 * products already carry a top-right bestseller/new badge (see
 * lib/productsData.ts), so the level badge moves to top-left to avoid
 * the two overlapping; duration keeps the spec's bottom-right slot,
 * which nothing else in this card ever occupies.
 *
 * DATA FLOW:
 * No data fetching — receives a single Product via props. No real
 * product photos exist yet, so the thumb shows an icon placeholder
 * (Rule 27 — swap for next/image once photos exist).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import type { Product } from "@/lib/productsData";

interface ProductCardProps {
  product: Product;
  /** Optional overlay rendered top-left of the thumb (e.g. Tutorials' level badge). */
  overlayTopLeft?: ReactNode;
  /** Optional overlay rendered bottom-right of the thumb (e.g. Tutorials' duration). */
  overlayBottomRight?: ReactNode;
}

const BADGE_LABELS: Record<NonNullable<Product["badge"]>, string> = {
  bestseller: "Bestseller",
  new: "New",
  limited: "Limited",
};

export default function ProductCard({ product, overlayTopLeft, overlayBottomRight }: ProductCardProps) {
  const Icon = CATEGORY_ICONS[product.iconName];

  return (
    <article className="productCard">
      <div className="productCardThumb">
        <Icon size={40} strokeWidth={1.5} className="productCardThumbIcon" aria-hidden="true" />
        {product.badge && <span className="productCardBadge">{BADGE_LABELS[product.badge]}</span>}
        {overlayTopLeft && <span className="productCardOverlayTopLeft">{overlayTopLeft}</span>}
        {overlayBottomRight && (
          <span className="productCardOverlayBottomRight">{overlayBottomRight}</span>
        )}
      </div>

      <div className="productCardBody">
        <h3 className="productCardTitle">{product.name}</h3>
        <p className="productCardMeta">
          <Star size={13} strokeWidth={0} fill="currentColor" aria-hidden="true" />
          {product.rating.average.toFixed(1)}/5 · {product.rating.count} reviews
        </p>
        <p className="productCardPrice">
          From ₱{product.price.startingPrice.toLocaleString("en-PH")}
          {product.price.managed ? "/mo" : ""}
        </p>

        <Link
          href={`/${product.category}/${product.slug}`}
          className="buttonSecondary productCardCta"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}
