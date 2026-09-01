/**
 * FILE: lib/templatesSectionData.ts
 * PURPOSE:
 * Static placeholder content for the homepage's Templates section
 * (IMPROVEMENTS.md Section 4A): the 6-item Benefits Grid, the 3-item
 * Why Us trust builder, and the demo video/caption. Pricing itself
 * reuses lib/pricingData.ts's PRICING_TIERS (already the exact
 * Managed/Self-Hosted/Custom breakdown the section needs) and
 * products reuse lib/productsData.ts's "templates" category items —
 * this file only holds the content that doesn't exist anywhere else
 * yet.
 *
 * DATA FLOW:
 * Imported by components/home/TemplatesSection.tsx only.
 */
import { Zap, ShieldCheck, Smartphone, Palette, Database, Headphones } from "lucide-react";
import type { FeatureGridItem } from "@/components/home/FeatureGrid";
import type { VideoCarouselItem } from "@/components/home/VideoCarousel";

export const TEMPLATE_BENEFITS: FeatureGridItem[] = [
  { icon: Zap, title: "Live in 48 hours", description: "Managed tier ships from checkout to a working booking site the same week." },
  { icon: Database, title: "Real-time booking engine", description: "Multi-room availability that updates instantly — no double-bookings." },
  { icon: ShieldCheck, title: "Security built in", description: "Rate limiting, RLS policies, and audit logging ship with every tier." },
  { icon: Smartphone, title: "Mobile-first design", description: "Every page works cleanly from a 375px phone up to a 27-inch display." },
  { icon: Palette, title: "3 design variants", description: "Static, Dynamic, or Modern — pick the look that fits your brand." },
  { icon: Headphones, title: "Real support, not a forum", description: "Email support on Managed, 30 days of setup help on Self-Hosted." },
];

export interface WhyUsPoint {
  heading: string;
  body: string;
}

export const TEMPLATE_WHY_US: WhyUsPoint[] = [
  {
    heading: "Built for resorts, not generic sites",
    body: "Every template starts from a working booking engine — you're not bolting one onto a page builder afterward.",
  },
  {
    heading: "You keep the code",
    body: "Self-Hosted and Custom tiers hand over full source code. Nothing is locked to our platform.",
  },
  {
    heading: "One team, start to launch",
    body: "The people who built the template are the people answering your setup questions.",
  },
];

export const TEMPLATE_DEMO_VIDEOS: VideoCarouselItem[] = [
  {
    id: "resort-booking-walkthrough",
    title: "See a 2-minute walkthrough of the dashboard in action",
    src: "/videos/resort-booking-demo.mp4",
    poster: "/images/resort-booking-demo-poster.jpg",
    captionsSrc: "/videos/captions/resort-booking-demo.vtt",
  },
];
