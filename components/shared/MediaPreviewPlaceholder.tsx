/**
 * FILE: components/shared/MediaPreviewPlaceholder.tsx
 * ROLE: Public — rendered inside HeroSection.tsx and QuickWins.tsx.
 *
 * PURPOSE:
 * Centered fallback graphic shown in place of a category's product
 * photo/video whenever the real file at lib/mediaShowcaseData.ts's
 * `src` hasn't been uploaded yet (see that file's "ASSETS — ACTION
 * NEEDED" note). Without this, a missing file rendered the browser's
 * raw broken-image glyph plus left-aligned alt text inside the card —
 * this replaces that with a proper empty state (Rule 25.3): an icon
 * and label, centered, tinted with the category's accent color.
 *
 * Once the real photos/videos are dropped in at the documented paths,
 * this component stops rendering automatically — see the onError
 * wiring in HeroSection.tsx / QuickWins.tsx that decides when to show it.
 */
import type { CSSProperties } from "react";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import type { CategoryShowcaseItem } from "@/lib/categoryShowcaseData";

interface MediaPreviewPlaceholderProps {
  iconName: CategoryShowcaseItem["iconName"];
  label: string;
  accentColor: string;
  /** "sm" for the smaller "Up Next" thumbnail, "md" for the main/featured one. */
  size?: "sm" | "md";
}

export default function MediaPreviewPlaceholder({
  iconName,
  label,
  accentColor,
  size = "md",
}: MediaPreviewPlaceholderProps) {
  const Icon = CATEGORY_ICONS[iconName];

  return (
    <div
      className="mediaPreviewPlaceholder"
      style={{ "--placeholderAccent": accentColor } as CSSProperties}
    >
      <span className="mediaPreviewPlaceholderIconWrap">
        <Icon size={size === "sm" ? 22 : 30} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="mediaPreviewPlaceholderLabel">{label}</span>
    </div>
  );
}
