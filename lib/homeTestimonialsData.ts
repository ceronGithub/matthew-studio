/**
 * FILE: lib/homeTestimonialsData.ts
 * PURPOSE:
 * Static content for the homepage's "What Our Creators Say" carousel.
 * Distinct from lib/testimonialsData.ts (the resort-owner quotes on
 * the standalone /testimonials page) — this set spans the marketplace
 * categories shown in the Category Showcase / Featured Products
 * sections above it, matching the homepage spec's "mixed product
 * categories" requirement.
 *
 * DATA FLOW:
 * Imported by components/home/TestimonialsSection.tsx. No real avatar
 * photos exist yet, so each card shows an initials avatar instead —
 * swap for next/image once real creator photos are available (Rule 27).
 */

import type { CategoryShowcaseItem } from "@/lib/categoryShowcaseData";

export interface HomeTestimonial {
  id: string;
  quote: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  categorySlug: string;
  categoryLabel: string;
  iconName: CategoryShowcaseItem["iconName"];
  rating: number;
}

export const HOME_TESTIMONIALS: HomeTestimonial[] = [
  {
    id: "rina-alvarez",
    quote:
      "We used to lose same-day bookings every time the front desk closed. Now guests book at 2am and we see it the next morning.",
    authorName: "Rina Alvarez",
    authorRole: "General Manager, Cabana Bay Resort",
    authorInitials: "RA",
    categorySlug: "templates",
    categoryLabel: "Templates",
    iconName: "layout-template",
    rating: 5,
  },
  {
    id: "jomar-santos",
    quote:
      "Ordered a batch of drop tees for our launch event. Print quality held up after a dozen washes and the checkout flow was painless.",
    authorName: "Jomar Santos",
    authorRole: "Merch Lead, Northline Collective",
    authorInitials: "JS",
    categorySlug: "tshirts",
    categoryLabel: "T-Shirts",
    iconName: "shirt",
    rating: 5,
  },
  {
    id: "priya-kapoor",
    quote:
      "The AI product teaser pack cut our ad creative turnaround from a week to an afternoon. Same quality our agency used to charge triple for.",
    authorName: "Priya Kapoor",
    authorRole: "Growth Marketer, Loop & Co.",
    authorInitials: "PK",
    categorySlug: "ai-videos",
    categoryLabel: "AI Videos",
    iconName: "clapperboard",
    rating: 4,
  },
  {
    id: "marcus-feld",
    quote:
      "The bulk file converter saved our team hours every week. It just runs — no crashes, no format surprises.",
    authorName: "Marcus Feld",
    authorRole: "Ops Lead, Azure Point",
    authorInitials: "MF",
    categorySlug: "file-tools",
    categoryLabel: "File Tools",
    iconName: "wrench",
    rating: 5,
  },
  {
    id: "dani-cruz",
    quote:
      "Next.js From Zero is the tutorial I recommend to every junior dev on our team now. Clear pacing, real projects, no filler.",
    authorName: "Dani Cruz",
    authorRole: "Engineering Manager, Fieldstack",
    authorInitials: "DC",
    categorySlug: "tutorials",
    categoryLabel: "Tutorials",
    iconName: "book-open",
    rating: 5,
  },
  {
    id: "joyce-tan",
    quote:
      "The fantasy hero rig dropped straight into our engine with clean topology. Saved our small team a full sprint of character prep.",
    authorName: "Joyce Tan",
    authorRole: "Indie Dev, Marlin Cove Studios",
    authorInitials: "JT",
    categorySlug: "game-characters",
    categoryLabel: "Game Characters",
    iconName: "box",
    rating: 4,
  },
];
