/**
 * FILE: components/shop/PricingGrid.tsx
 * ROLE: Public — main content of the Template Shop page (/shop).
 *
 * PURPOSE:
 * Renders the three pricing tiers as cards with staggered entrance
 * animation. The middle/recommended tier gets an accent border and a
 * "Recommended" badge. Every CTA currently routes to /contact, where
 * the visitor can book a demo — no checkout flow exists yet.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PricingTier } from "@/lib/pricingData";

export default function PricingGrid({ tiers }: { tiers: PricingTier[] }) {
  return (
    <section className="pricingGridSection">
      <div className="pricingGrid">
        {tiers.map((tier, index) => (
          <motion.article
            key={tier.slug}
            className={tier.highlighted ? "pricingCard pricingCardHighlighted" : "pricingCard"}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
          >
            {tier.highlighted && <span className="pricingCardBadge">Recommended</span>}

            <div>
              <h2 className="pricingCardName">{tier.name}</h2>
              <div className="pricingCardPriceRow">
                <span className="pricingCardPrice">{tier.price}</span>
                <span className="pricingCardPriceSuffix">{tier.priceSuffix}</span>
              </div>
            </div>

            <p className="pricingCardDescription">{tier.description}</p>

            <ul className="pricingCardFeatureList">
              {tier.features.map((feature) => (
                <li key={feature} className="pricingCardFeatureItem">
                  <Check size={16} strokeWidth={2} className="pricingCardFeatureIcon" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={`/contact?tier=${tier.slug}`}
              className={tier.highlighted ? "buttonPrimary pricingCardCta" : "buttonSecondary pricingCardCta"}
            >
              {tier.ctaLabel}
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
