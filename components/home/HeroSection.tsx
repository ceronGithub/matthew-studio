/**
 * FILE: components/home/HeroSection.tsx
 * ROLE: Public — top section of the Home/Landing page.
 *
 * PURPOSE:
 * Introduces the resort booking template with a headline, supporting
 * copy, and the two primary CTAs ("Browse Templates" and "See Case
 * Studies"). The visual is a CSS/SVG browser mockup rather than a real
 * photo — swap in an actual product screenshot in the mockScreen area
 * once real assets are available.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck2 } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="heroSection">
      <div className="heroContainer">
        <motion.div
          className="heroCopy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow">Resort Booking Templates</p>
          <h1 className="heroTitle">
            Turn your resort&apos;s website into a 24/7 booking engine
          </h1>
          <p className="heroSubtitle">
            A production-ready template built for multi-room resorts — booking, promos,
            and an admin dashboard included. No more phone-tag with guests.
          </p>

          <div className="heroActions">
            <Link href="/shop" className="buttonPrimary">
              Browse Templates
              <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <Link href="/portfolio" className="buttonSecondary">
              <CalendarCheck2 size={18} strokeWidth={1.75} aria-hidden="true" />
              See Case Studies
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="heroVisual"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          aria-hidden="true"
        >
          {/* Decorative browser-window mockup — replace with a real product screenshot */}
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
