/**
 * FILE: lib/contactData.ts
 * PURPOSE:
 * Static config for the Contact/Get Demo page (/contact) — the tier
 * options shown in the form select (kept in sync with pricingData.ts
 * slugs so a ?tier= link from /shop pre-selects the right one), and
 * the calendar booking link for a live walkthrough call.
 *
 * DATA FLOW:
 * No database — replace CALENDAR_BOOKING_URL with a real
 * Calendly/Cal.com link when one exists.
 */

export const CALENDAR_BOOKING_URL = "https://cal.com/your-handle/walkthrough";

export const TIER_OPTIONS: { slug: string; label: string }[] = [
  { slug: "managed-saas", label: "Managed SaaS" },
  { slug: "self-hosted", label: "Self-Hosted" },
  { slug: "custom-build", label: "Custom Build" },
  { slug: "not-sure", label: "Not sure yet" },
];
