/**
 * FILE: components/home/HeroSection.tsx
 * ROLE: Public — top section of the Home/Landing page.
 *
 * PURPOSE:
 * Introduces the marketplace with a headline, supporting copy, and two
 * primary CTAs ("Browse All Products" and "See What's New"). The visual
 * is a CSS/SVG browser mockup standing in for a real product screenshot
 * carousel — swap in real screenshots once assets are available.
 *
 * DATA FLOW:
 * No data fetching — all copy is static. Entrance animation runs once
 * on mount (headline → subheading → CTAs, staggered by fixed delays).
 * The visual additionally tracks page scroll to apply a subtle parallax
 * offset, per the homepage animation spec.
 */
"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef } from "react";

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

  return (
    <section className="heroSection" ref={sectionRef}>
      <div className="heroContainer">
        <div className="heroCopy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            All-In-One Creator Marketplace
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
            <Link href="/shop" className="buttonPrimary">
              Browse All Products
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/shop?sort=newest" className="buttonSecondary">
              <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />
              See What&apos;s New
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="heroVisual"
          style={{ y: parallaxY }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          aria-hidden="true"
        >
          {/* Decorative browser-window mockup — replace with a real product carousel screenshot */}
          <div className="mockBrowser">
            <div className="mockBrowserBar">
              <span className="mockBrowserDot" />
              <span className="mockBrowserDot" />
              <span className="mockBrowserDot" />
            </div>
            <div className="mockScreen">
              <div className="mockScreenHeader" />
              <div className="mockScreenGrid">
                <div className="mockScreenCard" />
                <div className="mockScreenCard" />
                <div className="mockScreenCard" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
