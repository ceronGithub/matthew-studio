/**
 * FILE: lib/tutorialsSectionData.ts
 * PURPOSE:
 * Static placeholder content for the homepage's Tutorials section
 * (IMPROVEMENTS.md Section 4E): the 3-persona "Who's this for?"
 * callout, plus a level/duration lookup for the "tutorials" category
 * products in lib/productsData.ts. Product identity (name, price,
 * rating) still comes from productsData.ts — this file only adds the
 * two tutorial-specific display fields the shared Product type
 * doesn't carry (level badge, duration), keyed by product id so
 * ProductCard.tsx never has to know tutorials exist.
 *
 * Spec note: "Persona background: subtle role-based color (e.g. blue
 * for devs, green for designers)" was intentionally not followed —
 * per Rule 17.2 (never more than one accent color per project), each
 * persona instead uses the single --color-accent token at a
 * different opacity step (same treatment FileToolsSection.tsx used
 * for its feature icons), which reads as variation without
 * introducing a second hue.
 *
 * DATA FLOW:
 * Imported by components/home/TutorialsSection.tsx only.
 */
import { Code2, Paintbrush, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TutorialPersona {
  icon: LucideIcon;
  role: string;
  bullet: string;
}

export const TUTORIAL_PERSONAS: TutorialPersona[] = [
  { icon: Code2, role: "Developers", bullet: "Ship production patterns, not toy examples." },
  { icon: Paintbrush, role: "Designers", bullet: "Turn your own Figma files into working code." },
  { icon: Rocket, role: "Founders", bullet: "Learn just enough to brief your dev team well." },
];

export type TutorialLevel = "Beginner" | "Intermediate" | "Advanced";

export interface TutorialMeta {
  level: TutorialLevel;
  duration: string;
}

/** Keyed by Product["id"] from lib/productsData.ts (category "tutorials"). */
export const TUTORIAL_META: Record<string, TutorialMeta> = {
  "nextjs-from-zero": { level: "Beginner", duration: "12 hours" },
  "figma-to-code": { level: "Intermediate", duration: "8 hours" },
  "prisma-postgres-crash-course": { level: "Advanced", duration: "6 hours" },
};

/** Fixed display order — Beginner first regardless of productsData.ts order. */
export const TUTORIAL_LEVEL_ORDER: TutorialLevel[] = ["Beginner", "Intermediate", "Advanced"];
