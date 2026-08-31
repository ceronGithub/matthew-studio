/**
 * FILE: components/home/CTABanner.tsx
 * ROLE: Public — bottom-of-homepage "Ready to Get Started?" banner.
 *
 * PURPOSE:
 * Final conversion push at the end of the homepage, after FAQ. Primary
 * CTA points to /products (pending — same forward-linking pattern used
 * by the other homepage sections, which currently point at /shop);
 * secondary CTA points to /contact, which already exists.
 *
 * DATA FLOW:
 * No data fetching — static copy, matches the homepage spec's exact
 * headline/subtext.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTABanner() {
  return (
    <section className="ctaBannerSection">
      <motion.div
        className="ctaBannerContainer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div
          className="ctaBannerText"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="ctaBannerHeading">Ready to Get Started?</h2>
          <p className="ctaBannerSubtext">Join 10K+ creators building amazing things</p>
        </motion.div>

        <motion.div
          className="ctaBannerActions"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <Link href="/products" className="buttonPrimary ctaBannerButtonPrimary">
            Browse All Products
          </Link>
          <Link href="/contact" className="buttonSecondary ctaBannerButtonSecondary">
            Book a Demo
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
