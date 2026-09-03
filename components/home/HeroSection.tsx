/**
 * FILE: components/home/HeroSection.tsx
 * ROLE: Public — top section of the Home/Landing page.
 *
 * PURPOSE:
 * Introduces the marketplace with a headline, supporting copy, two
 * primary CTAs, and a rotating showcase of real product photos/videos
 * (lib/mediaShowcaseData.ts) inside a layered floating-card visual —
 * matches the approved homepage mockup's card-main / card-secondary /
 * card-badge layout, replacing the old icon-only browser mockup now
 * that real product media exists. The ambient glow behind the visual
 * tints to match whichever item is currently active (color/opacity
 * transition only, per Rule 17.5 — never a layout-shifting property).
 *
 * DATA FLOW:
 * hooks/useMediaCarousel.ts advances HERO_MEDIA_ITEMS on a timer,
 * paused while the visual is hovered and skipped entirely under
 * prefers-reduced-motion. Entrance animation runs once on mount
 * (headline → subheading → CTAs, staggered by fixed delays) — same as
 * before. The visual additionally tracks page scroll to apply a
 * subtle parallax offset, per the homepage animation spec — unchanged.
 *
 * MOTION:
 * The active-item crossfade added a slight scale (0.98 → 1) alongside
 * its existing opacity fade (visitor_specification.md §3.5) instead of
 * a flat opacity-only swap. Gated for free by the root layout's
 * <MotionConfig reducedMotion="user"> — no extra check needed here.
 *
 * The scroll-linked parallax (parallaxY below) is a different case:
 * it's a raw useTransform MotionValue piped straight into style.y, not
 * an animate/transition prop, so MotionConfig's reducedMotion="user"
 * never touches it. Per buyer_homepage_specification_done.md §13.2 row
 * "Mobile ... disable parallax entirely" and "Reduced motion ... no
 * translate/parallax", it's explicitly zeroed on mobile viewports and
 * under prefers-reduced-motion via the same two hooks every other
 * homepage section already uses for this.
 */
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Calendar, Sparkle } from "lucide-react";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { HERO_MEDIA_ITEMS, type MediaShowcaseItem } from "@/lib/mediaShowcaseData";
import { useMediaCarousel } from "@/hooks/useMediaCarousel";
import { useIsMobileViewport } from "@/lib/hooks/useIsMobileViewport";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import MediaPreviewPlaceholder from "@/components/shared/MediaPreviewPlaceholder";

/**
 * HeroMediaVisual
 * Same fallback pattern as QuickWinsMediaVisual (components/home/QuickWins.tsx):
 * shows the real photo/video, or a centered MediaPreviewPlaceholder if
 * the file 404s. `size` controls the placeholder icon size so the
 * smaller "Up Next" thumb doesn't get an oversized icon.
 */
function HeroMediaVisual({ item, size = "md" }: { item: MediaShowcaseItem; size?: "sm" | "md" }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <MediaPreviewPlaceholder
        iconName={item.iconName}
        label={item.caption}
        accentColor={item.accentColor}
        size={size}
      />
    );
  }

  return item.type === "video" ? (
    <video
      src={item.src}
      autoPlay={size === "md"}
      muted
      loop
      playsInline
      aria-label={item.alt}
      onError={() => setHasError(true)}
    />
  ) : (
    <Image
      src={item.src}
      alt={item.alt}
      fill
      sizes={size === "md" ? "300px" : "180px"}
      style={{ objectFit: "cover" }}
      // Only the primary (md) visual is the actual above-the-fold LCP
      // candidate — the smaller "Up Next" thumbnail stays lazy so it
      // doesn't compete for the browser's priority fetch budget.
      priority={size === "md"}
      onError={() => setHasError(true)}
    />
  );
}

export default function HeroSection() {
  // Tracks this section's scroll progress so the visual can move at a
  // fraction of scroll speed (parallax) — only while the section is
  // passing through the viewport, not for the whole page scroll.
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // 0.1x scroll speed: moves at most 40px over the section's scroll range.
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  // Per §13.2: parallax is disabled entirely on mobile viewports and for
  // visitors who've asked for reduced motion — neither is served by a
  // scroll-linked transform on the visual.
  const isMobileViewport = useIsMobileViewport();
  const prefersReducedMotion = usePrefersReducedMotion();
  const disableParallax = isMobileViewport || prefersReducedMotion;

  const { activeIndex, pause, resume } = useMediaCarousel(HERO_MEDIA_ITEMS.length, 5000);
  const activeItem = HERO_MEDIA_ITEMS[activeIndex];
  const nextItem = HERO_MEDIA_ITEMS[(activeIndex + 1) % HERO_MEDIA_ITEMS.length];

  return (
    <section
      className="heroSection"
      ref={sectionRef}
      style={{ "--activeAccent": activeItem.accentColor } as CSSProperties}
    >
      {/* Ambient blurred glow, tinted to the active media item's accent
          color. Purely decorative — sits behind heroContainer via z-index,
          never intercepts clicks. */}
      <div className="heroAmbientGlow" aria-hidden="true" />

      <div className="heroContainer">
        <div className="heroCopy">
          <motion.p
            className="eyebrow heroKicker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Sparkle size={12} strokeWidth={2} aria-hidden="true" />
            18+ products across 6 categories
          </motion.p>

          <motion.h1
            className="heroTitle homeHeroTitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Everything You Need to Build, Design &amp; Create
          </motion.h1>

          <motion.p
            className="heroSubtitle homeHeroSubtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            Premium templates, designs, tutorials &amp; tools for creators — all in
            one marketplace.
          </motion.p>

          <motion.div
            className="heroActions"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href="/products" className="buttonPrimary">
              Browse All Products
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/contact" className="buttonSecondary">
              <Calendar size={18} strokeWidth={1.75} aria-hidden="true" />
              Book a Demo
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="heroVisual"
          style={{ y: disableParallax ? 0 : parallaxY }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          // Pausing on hover/focus lets a visitor actually read the active
          // card instead of it rotating out from under them mid-look.
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
        >
          <span className="heroVisualBadge">
            <span
              className="heroVisualBadgeDot"
              style={{ backgroundColor: activeItem.accentColor }}
              aria-hidden="true"
            />
            Delivered in 48h
          </span>

          <div className="heroMediaCardMain">
            <span className="heroMediaCardTag" style={{ color: activeItem.accentColor }}>
              {activeItem.type === "video" ? "Now Playing" : "Featured"}
            </span>
            <div className="heroMediaCardThumb">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem.id}
                  className="heroMediaCardThumbInner"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <HeroMediaVisual item={activeItem} size="md" />
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="heroMediaCardCaption">{activeItem.caption}</p>
            {activeItem.subcaption && <p>{activeItem.subcaption}</p>}
          </div>

          <div className="heroMediaCardSecondary">
            <span className="heroMediaCardTag" style={{ color: nextItem.accentColor }}>
              Up Next
            </span>
            <div className="heroMediaCardThumbSmall">
              <HeroMediaVisual item={nextItem} size="sm" />
            </div>
            <p className="heroMediaCardCaption">{nextItem.caption}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
