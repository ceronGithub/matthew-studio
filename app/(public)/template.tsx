/**
 * FILE: app/(public)/template.tsx
 * ROLE: Public — page-transition wrapper for every route under
 * app/(public)/ (Home, Products, Shop, Pricing, About, Blog,
 * Tutorials, Contact, legal pages, etc.).
 *
 * PURPOSE:
 * Next.js re-mounts a template.tsx instance on every navigation
 * between sibling routes (unlike layout.tsx, which persists), so
 * nesting one here — inside app/(public)/layout.tsx's <main> — gives
 * every marketing-page route change a brief crossfade-in instead of
 * an instant, jarring swap, per visitor_specification.md §3.4.
 *
 * MOTION:
 * 180ms opacity fade-in on mount (§3.4's "150–200ms" range). No exit
 * animation — Next.js templates don't support one without a much
 * heavier AnimatePresence + usePathname setup at the layout level,
 * which risks interfering with Server Component streaming on this
 * scale of site; a fade-in alone already removes the hard-cut feel
 * §3.4 calls out. Respects prefers-reduced-motion for free via the
 * root layout's <MotionConfig reducedMotion="user"> (app/layout.tsx).
 */
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function PublicTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
