/**
 * FILE: components/home/TutorialsSection.tsx
 * ROLE: Public — homepage section for the Tutorials category
 * (IMPROVEMENTS.md Section 4E). Purpose: "Educate buyers on what
 * fits them. Show depth of catalog." — one of the two lighter
 * sections, no comparison table or video demo.
 *
 * PURPOSE:
 * Header, a "Who's this for?" 3-persona callout (reuses FeatureGrid —
 * it's already the exact icon + role + one-line layout the spec
 * calls for), product cards for the "tutorials" category grouped by
 * level (Beginner → Intermediate → Advanced, staggered per group per
 * spec's "Entrance: Stagger by level group"), and a CTA.
 *
 * DATA FLOW:
 * Reads TUTORIAL_PERSONAS/TUTORIAL_COURSE_META/COURSE_LEVEL_LABELS
 * (tutorialsSectionData.ts, static) and fetches the live "tutorials"
 * product cards via useCategoryProducts (task-126's shared hook),
 * replacing the old static PRODUCTS filter so a DB-only product
 * appears here without a code change, sorted into level order.
 * Course level and duration aren't part of the shared Product type
 * (only this category needs them), so they're passed into
 * ProductCard's overlayTopLeft/overlayBottomRight slots (level badge
 * top-left, duration bottom-right, over the thumb image) rather than
 * added to every product in the catalog — matches
 * buyer_homepage_specification.md Section 3.9's "badge positioned
 * top-right, duration positioned bottom-right per card" overlay
 * intent; the level badge sits top-left instead of top-right
 * specifically because several tutorial products already carry a
 * top-right bestseller/new badge (see ProductCard.tsx's header note).
 * TUTORIAL_COURSE_META is keyed by slug (not id) — same fix task-126
 * applied to the game-characters tag lookup: a DB-generated product
 * id is a cuid, not the slug, so id-keyed lookups only worked by
 * coincidence in the static catalog where id === slug.
 */
"use client";

import Link from "next/link";
import SectionHeader from "@/components/shared/SectionHeader";
import FeatureGrid from "@/components/home/FeatureGrid";
import ProductCard from "@/components/home/ProductCard";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useCategoryProducts } from "@/lib/hooks/useCategoryProducts";
import { TUTORIAL_PERSONAS, TUTORIAL_COURSE_META, COURSE_LEVEL_LABELS, type CourseLevel } from "@/lib/tutorialsSectionData";

// How many placeholder cards the loading skeleton shows (Rule 25.2).
const SKELETON_CARD_COUNT = 3;

const LEVEL_ORDER: CourseLevel[] = ["beginner", "intermediate", "advanced"];

export default function TutorialsSection() {
  const { products, isLoading, error, refetch } = useCategoryProducts("tutorials");

  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader eyebrow="Tutorials" title="Learn from real projects" subtitle="Grouped by level, so you start at the right place." />

        <FeatureGrid items={TUTORIAL_PERSONAS} />

        {isLoading ? (
          // Loading state (Rule 25.2) — skeleton cards mirror the real card shape.
          <div className="productCardsGrid" aria-busy="true" aria-label="Loading tutorials">
            {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
              <div key={index} className="productCardSkeleton">
                <div className="productCardSkeletonThumb skeletonBlock" />
                <div className="productCardSkeletonBody">
                  <div className="productCardSkeletonLine skeletonBlock" />
                  <div className="productCardSkeletonLine productCardSkeletonLine--short skeletonBlock" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state (Rule 25.4) — friendly message + retry, never the raw error.
          <div className="productsEmpty" role="alert">
            <p>{error}</p>
            <button type="button" className="buttonSecondary" onClick={refetch}>
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          // Empty state (Rule 25.3) — action-specific, never a blank grid.
          <p className="productsEmpty">No Tutorials products are published yet.</p>
        ) : (
          <div className="productCardsGrid">
            {LEVEL_ORDER.flatMap((level, groupIndex) =>
              products.filter((product) => TUTORIAL_COURSE_META[product.slug]?.level === level).map((product, itemIndex) => (
                <ScrollReveal
                  key={product.id}
                  delay={groupIndex * 0.15 + itemIndex * 0.05}
                >
                  <ProductCard
                    product={product}
                    overlayTopLeft={
                      <span className={`levelBadge levelBadge${level.charAt(0).toUpperCase()}${level.slice(1)}`}>
                        {COURSE_LEVEL_LABELS[level]}
                      </span>
                    }
                    overlayBottomRight={
                      <span className="tutorialCardDuration">{TUTORIAL_COURSE_META[product.slug]?.duration}</span>
                    }
                  />
                </ScrollReveal>
              ))
            )}
          </div>
        )}

        <div className="sectionCTA">
          <Link href="/tutorials" className="buttonPrimary">
            Browse All Courses
          </Link>
        </div>
      </div>
    </section>
  );
}
