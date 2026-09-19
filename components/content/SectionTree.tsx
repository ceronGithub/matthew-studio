/**
 * FILE: components/content/SectionTree.tsx
 * ROLE: Super-admin only — left panel of ContentEditor.tsx.
 *
 * PURPOSE:
 * Groups the flat section list by area, per Section 3.7's own
 * grouping example ("Homepage > Hero, Homepage > FAQ, Shop > Pricing
 * Tiers, Blog, etc."). Grouping is derived from the sectionKey prefix
 * before its first "." (e.g. "homepage.hero" -> Homepage), matching
 * the dotted examples already in the ContentSection Prisma model's
 * own doc comment ("homepage.hero", "shop.pricing", "footer"). Any
 * prefix outside the four spec-named areas falls into "Other" rather
 * than being dropped, so an unexpected sectionKey never disappears
 * from the tree silently.
 */
"use client";

import type { ContentSectionListItem } from "@/lib/hooks/useContentSections";

const GROUP_LABELS: Record<string, string> = {
  homepage: "Homepage",
  shop: "Shop / Pricing",
  page: "Standalone Pages",
  sitewide: "Site-wide",
};

function groupSections(sections: ContentSectionListItem[]): Map<string, ContentSectionListItem[]> {
  const groups = new Map<string, ContentSectionListItem[]>();
  for (const section of sections) {
    const prefix = section.sectionKey.includes(".") ? section.sectionKey.split(".")[0] : "sitewide";
    const groupLabel = GROUP_LABELS[prefix] ?? "Other";
    const existing = groups.get(groupLabel) ?? [];
    groups.set(groupLabel, [...existing, section]);
  }
  return groups;
}

interface SectionTreeProps {
  sections: ContentSectionListItem[];
  selectedSectionId: string | null;
  onSelect: (sectionId: string) => void;
}

export default function SectionTree({ sections, selectedSectionId, onSelect }: SectionTreeProps) {
  const groups = groupSections(sections);

  return (
    <nav className="sectionTree" aria-label="Content sections">
      {Array.from(groups.entries()).map(([groupLabel, groupSectionsList]) => (
        <div className="sectionTreeGroup" key={groupLabel}>
          <p className="sectionTreeGroupLabel">{groupLabel}</p>
          <ul className="sectionTreeList">
            {groupSectionsList.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className={`sectionTreeItem${section.id === selectedSectionId ? " sectionTreeItem--active" : ""}`}
                  onClick={() => onSelect(section.id)}
                  aria-current={section.id === selectedSectionId ? "true" : undefined}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
