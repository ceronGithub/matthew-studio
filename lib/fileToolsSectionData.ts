/**
 * FILE: lib/fileToolsSectionData.ts
 * PURPOSE:
 * Static placeholder content for the homepage's File Tools section
 * (IMPROVEMENTS.md Section 4D): the 3-item feature grid. Product
 * cards reuse the "file-tools" category items already in
 * lib/productsData.ts — this file only holds the feature copy.
 *
 * DATA FLOW:
 * Imported by components/home/FileToolsSection.tsx only. Icon colors
 * "rotate through accent variants (green, teal, coral)" per spec —
 * since the project's design system deliberately keeps to one accent
 * color (Rule 17.2: never more than one accent per project), each
 * icon instead uses the single --color-accent token at a different
 * opacity step, which reads as variation without breaking that rule.
 */
import { RefreshCw, FileArchive, ImageOff } from "lucide-react";
import type { FeatureGridItem } from "@/components/home/FeatureGrid";

export const FILE_TOOLS_FEATURES: FeatureGridItem[] = [
  { icon: RefreshCw, title: "Convert in bulk", description: "Batch-convert hundreds of files in one pass, no per-file clicking." },
  { icon: FileArchive, title: "Shrink without losing quality", description: "Compress PDFs and images with no visible quality drop." },
  { icon: ImageOff, title: "One-click background removal", description: "Clean product photos in seconds, exported ready to use." },
];
