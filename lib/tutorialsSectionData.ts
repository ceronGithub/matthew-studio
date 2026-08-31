/**
 * FILE: lib/tutorialsSectionData.ts
 * PURPOSE:
 * Static placeholder content for the homepage's Tutorials section
 * (IMPROVEMENTS.md Section 4E): the 3-persona "Who's this for?"
 * callout. Product cards reuse the "tutorials" category items
 * already in lib/productsData.ts — this file only holds the persona
 * copy and the course-level badge/order used to group those cards.
 *
 * DATA FLOW:
 * Imported by components/home/TutorialsSection.tsx only. Reuses the
 * FeatureGridItem shape (icon + title + description) for the persona
 * cards since it's already the exact "icon + role + one line" layout
 * the spec calls for — no need for a separate one-off type.
 */
import { Code2, Palette, Briefcase } from "lucide-react";
import type { FeatureGridItem } from "@/components/home/FeatureGrid";

export const TUTORIAL_PERSONAS: FeatureGridItem[] = [
  {
    icon: Code2,
    title: "Developers",
    description: "Ship faster with real project walkthroughs, not toy examples.",
  },
  {
    icon: Palette,
    title: "Designers",
    description: "Learn just enough code to turn your own Figma files into production UI.",
  },
  {
    icon: Briefcase,
    title: "Freelancers",
    description: "Pick up the exact stack clients are already asking for.",
  },
];

export type CourseLevel = "beginner" | "intermediate" | "advanced";

/** Maps a product id (lib/productsData.ts, category "tutorials") to its course level and duration meta. */
export const TUTORIAL_COURSE_META: Record<string, { level: CourseLevel; duration: string }> = {
  "nextjs-from-zero": { level: "beginner", duration: "16 lessons" },
  "figma-to-code": { level: "intermediate", duration: "12 hours" },
  "prisma-postgres-crash-course": { level: "advanced", duration: "9 hours" },
};

export const COURSE_LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
