/**
 * FILE: lib/contactData.ts
 * PURPOSE:
 * Static config for the Contact/Get Demo page (/contact) — the
 * category options (every marketplace category, sourced from
 * categoryShowcaseData.ts so it can't drift) and the Templates-only
 * tier options (kept in sync with pricingData.ts slugs so a ?tier=
 * link from /templates or /pricing pre-selects the right one), plus
 * the calendar booking link for a live walkthrough call. Per
 * improvement_1.md Section 3: the tier dropdown only applies to
 * Templates — other categories don't have tiers yet, so the form
 * asks for category first and only shows the tier field when
 * Templates is selected.
 *
 * DATA FLOW:
 * No database — replace CALENDAR_BOOKING_URL with a real
 * Calendly/Cal.com link when one exists.
 */

import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";

export const CALENDAR_BOOKING_URL = "https://cal.com/your-handle/walkthrough";

export const CATEGORY_OPTIONS: { slug: string; label: string }[] = [
  ...CATEGORY_SHOWCASE.map((category) => ({ slug: category.slug, label: category.name })),
  { slug: "not-sure", label: "Not sure yet" },
];

export const TIER_OPTIONS: { slug: string; label: string }[] = [
  { slug: "managed-saas", label: "Managed SaaS" },
  { slug: "self-hosted", label: "Self-Hosted" },
  { slug: "custom-build", label: "Custom Build" },
  { slug: "not-sure", label: "Not sure yet" },
];
