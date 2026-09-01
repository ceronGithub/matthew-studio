/**
 * FILE: components/home/FeaturedProducts.tsx
 * ROLE: Public — "Bestsellers This Month" section of the homepage.
 *
 * PURPOSE:
 * Shows a handful of top products spanning different marketplace
 * categories. On tablet/desktop it auto-scrolls horizontally in an
 * infinite loop (pauses on hover or manual scroll); on mobile it
 * renders as a plain vertical stack instead, per the homepage
 * animation spec, since an infinite horizontal loop doesn't translate
 * to a single column.
 *
 * DATA FLOW:
 * Reads FEATURED_PRODUCTS (static). No real product photos exist yet,
 * so each card shows a category-tinted icon placeholder — swap for
 * next/image once real thumbnails are available (Rule 27). Each
 * card's "View Details" link goes to that product's detail page at
 * "/[categorySlug]/[id]" — FEATURED_PRODUCTS.id is always kept equal
 * to the matching lib/productsData.ts Product.slug by convention, so
 * no extra lookup is needed here.
 */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutTemplate,
  Shirt,
  Clapperboard,
  Wrench,
  BookOpen,
  Box,
  Star,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { FEATURED_PRODUCTS, type FeaturedProduct } from "@/lib/featuredProductsData";

const CATEGORY_ICONS: Record<FeaturedProduct["iconName"], LucideIcon> = {
  "layout-template": LayoutTemplate,
  shirt: Shirt,
  clapperboard: Clapperboard,
  wrench: Wrench,
  "book-open": BookOpen,
  box: Box,
};

// Duplicated once so the auto-scroll can jump from the end of the first
// copy back to 0 the instant it crosses the halfway point — the two
// copies look identical at that boundary, so the reset is invisible.
const LOOP_PRODUCTS = [...FEATURED_PRODUCTS, ...FEATURED_PRODUCTS];

// Roughly one card-width per arrow click (card + gap, see home.css).
const ARROW_SCROLL_DISTANCE = 320;

function ProductCard({ product }: { product: FeaturedProduct }) {
  const Icon = CATEGORY_ICONS[product.iconName];
  return (
    <article className="featuredProductCard">
      <div className="featuredProductThumb">
        <Icon size={40} strokeWidth={1.5} className="featuredProductThumbIcon" aria-hidden="true" />
      </div>

      <div className="featuredProductBody">
        <span className="featuredProductCategoryBadge">{product.categoryLabel}</span>
        <h3 className="featuredProductName">{product.name}</h3>
        <p className="featuredProductRating">
          <Star size={14} strokeWidth={0} fill="currentColor" aria-hidden="true" />
          {product.rating.average.toFixed(1)}/5 · {product.rating.count} reviews
        </p>
        <p className="featuredProductPrice">{product.price}</p>
        <Link
          href={`/${product.categorySlug}/${product.id}`}
          className="buttonSecondary featuredProductCta"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

export default function FeaturedProducts() {
  // Auto-scroll only applies at tablet width and up — on mobile the
  // section renders as a plain vertical stack (see isDesktop below).
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const applyMatch = () => setIsDesktop(query.matches);
    applyMatch();
    query.addEventListener("change", applyMatch);
    return () => query.removeEventListener("change", applyMatch);
  }, []);

  // Auto-scroll loop: nudges scrollLeft a tiny amount every frame so the
  // full strip takes ~20s to pass once, then resets seamlessly at the
  // halfway point (where the duplicated items line back up with the
  // originals). Pauses whenever the user is hovering or has just used
  // an arrow button.
  useEffect(() => {
    if (!isDesktop || isPaused) return;
    const track = trackRef.current;
    if (!track) return;

    let animationFrameId: number;
    const pixelsPerSecond = track.scrollWidth / 2 / 20; // full pass in 20s

    let lastTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      track.scrollLeft += pixelsPerSecond * deltaSeconds;
      // Halfway point = end of the first (non-duplicated) set of cards.
      if (track.scrollLeft >= track.scrollWidth / 2) {
        track.scrollLeft -= track.scrollWidth / 2;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDesktop, isPaused]);

  function scrollByArrow(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * ARROW_SCROLL_DISTANCE, behavior: "smooth" });
  }

  return (
    <section className="featuredProductsSection">
      <motion.div
        className="featuredProductsContainer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="featuredProductsHeader">
          <p className="eyebrow">Bestsellers This Month</p>
          <h2 className="sectionTitle">What creators are buying right now</h2>
        </div>

        <div
          className="featuredProductsCarousel"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {isDesktop ? (
            <>
              <div className="featuredProductsTrack" ref={trackRef}>
                {LOOP_PRODUCTS.map((product, index) => (
                  <ProductCard key={`${product.id}-${index}`} product={product} />
                ))}
              </div>

              <button
                type="button"
                className="featuredProductsArrow featuredProductsArrowPrev"
                aria-label="Scroll bestsellers left"
                onClick={() => scrollByArrow(-1)}
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="featuredProductsArrow featuredProductsArrowNext"
                aria-label="Scroll bestsellers right"
                onClick={() => scrollByArrow(1)}
              >
                <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            </>
          ) : (
            <div className="featuredProductsStack">
              {FEATURED_PRODUCTS.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
