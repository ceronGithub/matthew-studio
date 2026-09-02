/**
 * FILE: app/layout.tsx
 * ROLE: Root layout — wraps every route in the app, public and superAdmin alike.
 *
 * PURPOSE:
 * Loads global fonts and stylesheets, and sets the default site-wide
 * metadata. Account-specific shells (nav, sidebar) live in each
 * account's own layout — never here (see app/superAdmin/layout.tsx).
 *
 * MotionConfig reducedMotion="user" (site-wide, Section 4/7.5): when
 * the visitor's OS has "reduce motion" enabled, every framer-motion
 * component under this tree automatically drops its transform-based
 * entrance animation (translateY, scale) and keeps only the opacity
 * fade — exactly the "opacity-only fade if reduced motion" fallback
 * the spec calls for, with no per-component change needed. This
 * covers motion.* usage everywhere (not just the homepage), which is
 * the correct scope — the same accessibility expectation applies
 * site-wide. Plain rAF/IntersectionObserver-driven motion (carousel
 * auto-scroll, video auto-play, count-up numbers) lives outside
 * framer-motion's reach, so those components check
 * usePrefersReducedMotion() (lib/hooks/usePrefersReducedMotion.ts)
 * directly instead.
 */
import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./styles/globals.css";
import "./styles/mediaQueries.css";

// Editorial rebrand (Rule 46 discovery flow — Mockup 1 approved):
// Fraunces carries headline/display treatment; Inter is the body
// workhorse; IBM Plex Mono replaces Geist Mono for the few remaining
// small-label/mono use cases site-wide.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Matthew Studio | Resort Booking Template",
  description:
    "Resort website templates with built-in multi-room booking, promos, and an admin dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
