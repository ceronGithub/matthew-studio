/**
 * FILE: components/home/TShirtsSection.tsx
 * ROLE: Public — homepage section for the T-Shirts category
 * (IMPROVEMENTS.md Section 4B). Purpose: "Sell identity & story" —
 * emotional connection + design showcase, one step lighter than the
 * Templates section's full comparison-table depth.
 *
 * PURPOSE:
 * Header, a manually-controlled Design Gallery Carousel (image +
 * overlay name/tagline, arrow navigation, subtle scroll parallax on
 * the image), a "The Story" quote callout, product cards for the
 * "tshirts" category, and a CTA. The carousel is section-specific
 * (not one of the Phase 1 reusable components — spec's file
 * structure only lists it under TShirtsSection.tsx).
 *
 * DATA FLOW:
 * Reads TSHIRT_DESIGN_GALLERY/TSHIRT_STORY (tshirtsSectionData.ts)
 * and PRODUCTS (productsData.ts) filtered to category "tshirts". No
 * real design photos exist yet — each gallery slide shows a tinted
 * gradient placeholder swapped to a real image once photos exist
 * (Rule 27).
 */
"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import ProductCard from "@/components/home/ProductCard";
import { PRODUCTS } from "@/lib/productsData";
import { TSHIRT_DESIGN_GALLERY, TSHIRT_STORY } from "@/lib/tshirtsSectionData";

const TSHIRT_PRODUCTS = PRODUCTS.filter((product) => product.category === "tshirts");

function DesignGalleryCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subtle parallax: the active slide's image shifts up to -10px as
  // the carousel itself scrolls through the viewport (Section 3,
  // "Parallax: Design images shift -10px on scroll within carousel range").
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });
  const imageParallaxY = useTransform(scrollYProgress, [0, 1], [0, -10]);

  function goTo(index: number) {
    setActiveIndex(((index % TSHIRT_DESIGN_GALLERY.length) + TSHIRT_DESIGN_GALLERY.length) % TSHIRT_DESIGN_GALLERY.length);
  }

  // Arrow-key navigation (Section 13 accessibility checklist: "Carousel
  // has keyboard navigation"), mirroring VideoCarousel's pattern.
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft") goTo(activeIndex - 1);
    if (event.key === "ArrowRight") goTo(activeIndex + 1);
  }

  const activeSlide = TSHIRT_DESIGN_GALLERY[activeIndex];

  return (
    <div className="designGalleryCarousel" ref={containerRef}>
      <div
        className="designGallerySlideWrap"
        role="group"
        aria-roledescription="carousel"
        aria-label="Shirt designs"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <motion.div
          key={activeSlide.id}
          className="designGallerySlide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            className={`designGalleryImage designGalleryImage${activeIndex % 3}`}
            style={{ y: imageParallaxY }}
          />
          <div className="designGalleryOverlay">
            <span className="designGalleryName">{activeSlide.designName}</span>
            <span className="designGalleryTagline">{activeSlide.tagline}</span>
          </div>
        </motion.div>

        <button
          type="button"
          className="designGalleryArrow designGalleryArrowPrev"
          aria-label="Previous design"
          onClick={() => goTo(activeIndex - 1)}
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="designGalleryArrow designGalleryArrowNext"
          aria-label="Next design"
          onClick={() => goTo(activeIndex + 1)}
        >
          <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="designGalleryDots" role="tablist" aria-label="Shirt designs">
        {TSHIRT_DESIGN_GALLERY.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`Show ${slide.designName}`}
            className={index === activeIndex ? "designGalleryDot designGalleryDotActive" : "designGalleryDot"}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TShirtsSection() {
  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader eyebrow="T-Shirts" title="Wear the culture" subtitle="Limited-run designs made for creators, not stock photo models." />

        <DesignGalleryCarousel />

        <motion.blockquote
          className="storyCallout"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="storyCalloutQuote">&ldquo;{TSHIRT_STORY.quote}&rdquo;</p>
          <cite className="storyCalloutAttribution">{TSHIRT_STORY.attribution}</cite>
        </motion.blockquote>

        <div className="productCardsGrid">
          {TSHIRT_PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="sectionCTA">
          <a href="/shop?category=tshirts" className="buttonPrimary">
            Shop T-Shirts
          </a>
        </div>
      </div>
    </section>
  );
}
