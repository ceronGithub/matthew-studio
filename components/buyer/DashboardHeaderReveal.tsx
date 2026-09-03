/**
 * FILE: components/buyer/DashboardHeaderReveal.tsx
 * ROLE: Buyer only — thin motion wrapper for the dashboard page's
 * welcome header (app/buyer/dashboard/page.tsx).
 *
 * PURPOSE:
 * buyer_homepage_specification.md §13.2 calls for the buyer dashboard
 * to move from a static render to a fade/scale-in entrance — this is
 * the first screen a buyer sees after signing in, always above the
 * fold, so it animates on mount (like the homepage Hero's text
 * stagger) rather than on scroll (whileInView), which would never
 * trigger for content that's already in view on load.
 *
 * The header content itself stays server-rendered in the page — this
 * component only owns the motion, taking the header's JSX as
 * children, so app/buyer/dashboard/page.tsx doesn't need "use client"
 * for the rest of the page (Rule 31.1: default to Server Components).
 *
 * DATA FLOW:
 * Pure presentational wrapper — no data fetching. Reduced-motion is
 * handled globally via <MotionConfig reducedMotion="user"> in
 * app/layout.tsx — no extra check needed here.
 */
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function DashboardHeaderReveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
