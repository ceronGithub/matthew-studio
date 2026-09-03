/**
 * FILE: components/legal/LegalDocument.tsx
 * ROLE: Public — shared body for every legal page (/security,
 * /privacy, /terms, /refund-policy), per improvement_1.md Section 4.
 *
 * PURPOSE:
 * Renders a LegalDocument (lib/legalData.ts) as a title, "last
 * updated" date, intro paragraph, and a list of headed sections. All
 * 4 legal pages share this one layout instead of four near-duplicate
 * page bodies.
 *
 * DATA FLOW:
 * No data fetching — receives a single LegalDocument via props from
 * its Server Component page. Entirely static; no Client Component
 * needed — ScrollReveal is a Client Component but wraps server-
 * rendered children without requiring this file itself to opt in.
 *
 * MOTION:
 * A single fade-only ScrollReveal entrance around the whole document
 * (visitor_specification.md §6 — "Legal pages: entrance fade only —
 * no card motion, these are read-heavy"). Because all 4 legal pages
 * (/security, /terms, /privacy, /refund-policy) share this component,
 * this one change completes both Step 5's /security item and all of
 * Step 6 (legal pages) at once.
 */
import type { LegalDocument as LegalDocumentType } from "@/lib/legalData";
import ScrollReveal from "@/components/shared/ScrollReveal";

interface LegalDocumentProps {
  document: LegalDocumentType;
}

export default function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <ScrollReveal className="legalPage">
      <div className="legalPageInner">
        <header className="legalPageHeader">
          <p className="eyebrow">Legal</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            {document.title}
          </h1>
          <p className="legalPageUpdated">Last updated: {document.lastUpdated}</p>
          <p className="heroSubtitle">{document.intro}</p>
        </header>

        <div className="legalPageSections">
          {document.sections.map((section) => (
            <section key={section.heading} className="legalPageSection">
              <h2 className="sectionTitle legalPageSectionTitle">{section.heading}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="legalPageSectionBody">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
