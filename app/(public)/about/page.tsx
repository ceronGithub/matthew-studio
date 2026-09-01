/**
 * FILE: app/(public)/about/page.tsx
 * ROLE: Public — company/marketplace "About" page, served at "/about".
 *
 * PURPOSE:
 * improvement_1.md Section 4's remaining missing page (alongside
 * /faq, now a redirect — see app/(public)/faq/page.tsx). Introduces
 * Matthew Studio as a marketplace, reuses the same category grid data
 * (CATEGORY_SHOWCASE) and stats already shown on the homepage's
 * QuickWins section so numbers never drift between pages, then lists
 * the 3 value pillars from lib/aboutData.ts. Ends with the same
 * "talk to us" CTA pattern used on /features and /how-it-works.
 *
 * DATA FLOW:
 * This Server Component reads CATEGORY_SHOWCASE and ABOUT_VALUES
 * directly — no fetch needed, both are local static arrays today.
 * Entirely static; no Client Component needed on this page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import "../../styles/about.css";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";
import { ABOUT_VALUES } from "@/lib/aboutData";

export const metadata: Metadata = {
  title: "About | Matthew Studio",
  description:
    "Matthew Studio is a digital marketplace for website templates, custom apparel, AI-generated video, file tools, tutorials, and game character assets.",
  openGraph: {
    title: "About | Matthew Studio",
    description:
      "Matthew Studio is a digital marketplace for website templates, custom apparel, AI-generated video, file tools, tutorials, and game character assets.",
    images: ["/og-home.png"],
  },
};

export default function AboutPage() {
  return (
    <>
      <header className="aboutPageHeader">
        <div className="aboutPageHeaderInner">
          <p className="eyebrow">About Matthew Studio</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            One marketplace, six categories, built to launch fast
          </h1>
          <p className="heroSubtitle">
            Matthew Studio brings website templates, custom apparel, AI-generated video, file
            tools, tutorials, and game character assets together in one catalog — so you&apos;re
            not piecing together five different vendors to get a project done.
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------------
       * CATEGORY GRID — same source of truth as the homepage's
       * Category Showcase, so this never drifts out of sync.
       * ------------------------------------------------------------ */}
      <section className="aboutSection">
        <div className="aboutSectionInner">
          <p className="eyebrow">What We Sell</p>
          <h2 className="sectionTitle">Six categories, one checkout</h2>
          <div className="aboutCategoryGrid">
            {CATEGORY_SHOWCASE.map((category) => {
              const Icon = CATEGORY_ICONS[category.iconName];
              return (
                <article key={category.slug} className="aboutCategoryCard">
                  <Icon size={28} strokeWidth={1.5} className="aboutCategoryCardIcon" aria-hidden="true" />
                  <h3 className="aboutCategoryCardTitle">{category.name}</h3>
                  <p className="aboutCategoryCardDescription">{category.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------
       * VALUES
       * ------------------------------------------------------------ */}
      <section className="aboutSection aboutSectionAlt">
        <div className="aboutSectionInner">
          <p className="eyebrow">How We Work</p>
          <h2 className="sectionTitle">What stays the same across every category</h2>
          <div className="aboutValuesGrid">
            {ABOUT_VALUES.map((value) => (
              <article key={value.title} className="aboutValueCard">
                <h3 className="aboutValueCardTitle">{value.title}</h3>
                <p className="aboutValueCardDescription">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="aboutNoteSection">
        <div className="aboutNoteInner">
          <p className="aboutNoteText">Have a question before you buy?</p>
          <Link href="/contact" className="buttonPrimary">
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}
