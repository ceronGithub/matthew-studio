/**
 * FILE: components/home/QuickWins.tsx
 * ROLE: Public — second section of the Home/Landing page.
 *
 * PURPOSE:
 * Builds quick credibility below the hero: a color-coded category
 * chip row (colors from lib/categoryAccentColors.ts, matching the
 * approved homepage mockup), a rotating media strip showing one
 * category's product photo/video at a time (tinting the section's
 * ambient background glow to match), and the headline marketplace
 * stats. Hovering or clicking a chip jumps the media strip straight
 * to that category. Stat numbers below are placeholders — replace
 * with real verified metrics before launch.
 *
 * DATA FLOW:
 * Category chips come from lib/categoryShowcaseData.ts — the same
 * source CategoryShowcase.tsx uses — so the two sections can never
 * list different categories. Media items + accent colors come from
 * lib/mediaShowcaseData.ts, cycled by hooks/useMediaCarousel.ts.
 */
"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { CSSProperties } from "react";
import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";
import { CATEGORY_ACCENT_COLORS } from "@/lib/categoryAccentColors";
import { QUICK_WINS_MEDIA_ITEMS } from "@/lib/mediaShowcaseData";
import { useMediaCarousel } from "@/hooks/useMediaCarousel";

const RESULT_STATS = [
  { value: "18+", label: "Products across 6 categories" },
  { value: "6", label: "Creator categories in one marketplace" },
  { value: "48h", label: "Average delivery time" },
];

export default function QuickWins() {
  const { activeIndex, setActiveIndex, pause, resume } = useMediaCarousel(
    QUICK_WINS_MEDIA_ITEMS.length,
    4500
  );
  const activeMedia = QUICK_WINS_MEDIA_ITEMS[activeIndex];

  return (
    <section
      className="quickWinsSection"
      style={{ "--activeAccent": activeMedia.accentColor } as CSSProperties}
    >
      <div className="quickWinsAmbientGlow" aria-hidden="true" />

      <div className="quickWinsContainer">
        <p className="quickWinsLabel">One marketplace, every category creators need</p>

        <div className="wordmarkRow">
          {CATEGORY_SHOWCASE.map((category, index) => (
            <motion.button
              key={category.slug}
              type="button"
              className={index === activeIndex ? "wordmarkChip wordmarkChipActive" : "wordmarkChip"}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
              onMouseEnter={() => {
                pause();
                setActiveIndex(index);
              }}
              onFocus={() => {
                pause();
                setActiveIndex(index);
              }}
              onMouseLeave={resume}
              onBlur={resume}
            >
              <span
                className="wordmarkChipSwatch"
                style={{ backgroundColor: CATEGORY_ACCENT_COLORS[category.slug] }}
                aria-hidden="true"
              />
              {category.name}
            </motion.button>
          ))}
        </div>

        {/* Rotating category media — cross-fades to the active item; the
            ambient glow above tints to match (opacity/color only, Rule 17.5). */}
        <div className="quickWinsMediaStrip" onMouseEnter={pause} onMouseLeave={resume}>
          <div className="quickWinsMediaFrame">
            <div className="quickWinsMediaItem">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMedia.id}
                  className="quickWinsMediaItemInner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {activeMedia.type === "video" ? (
                    <video
                      src={activeMedia.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      aria-label={activeMedia.alt}
                    />
                  ) : (
                    <Image
                      src={activeMedia.src}
                      alt={activeMedia.alt}
                      fill
                      sizes="(min-width: 768px) 420px, 100vw"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <span className="quickWinsMediaCaption">{activeMedia.caption}</span>
          </div>

          <div className="quickWinsMediaDots">
            {QUICK_WINS_MEDIA_ITEMS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="quickWinsMediaDot"
                aria-label={`Show ${item.caption}`}
                aria-current={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                <span
                  className={
                    index === activeIndex
                      ? "quickWinsMediaDotVisual quickWinsMediaDotVisualActive"
                      : "quickWinsMediaDotVisual"
                  }
                  style={index === activeIndex ? { backgroundColor: item.accentColor } : undefined}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="statGrid">
          {RESULT_STATS.map((stat, index) => (
            <motion.article
              key={stat.label}
              className="statCard"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
            >
              <p className="statValue">{stat.value}</p>
              <p className="statLabel">{stat.label}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
