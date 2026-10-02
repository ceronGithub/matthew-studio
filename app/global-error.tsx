"use client";

/**
 * FILE: app/global-error.tsx
 * ROLE: Public — last-resort error boundary for errors thrown in the
 * root layout itself (Rule 31.10). app/error.tsx cannot catch those.
 *
 * PURPOSE:
 * When active, this file REPLACES the root layout, so it has to provide
 * its own <html> and <body>, load the global styles, load the fonts and
 * apply the saved theme — none of that is inherited from app/layout.tsx.
 * It deliberately skips the ThemeProvider, cart, navbar and footer: the
 * layout that failed may be exactly what broke, so this page depends on
 * as little as possible.
 *
 * DATA FLOW:
 * 1. Next.js renders this component in place of the whole app.
 * 2. The effect applies the saved theme and logs the error.
 * 3. "Try again" calls retry(); "Back to homepage" is a full page load.
 */
import { useEffect } from "react";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./styles/globals.css";
import ErrorState from "@/components/shared/ErrorState";

// Same font setup and CSS variable names as app/layout.tsx, repeated here
// because this file replaces that layout and cannot reuse its fonts.
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

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // The root layout's anti-flash theme script does not run here, so apply the
    // saved theme once on mount. try/catch because localStorage can be blocked
    // (privacy mode, some extensions); the light theme is the fallback.
    try {
      const storedTheme = localStorage.getItem("matthewStudioTheme");
      document.documentElement.setAttribute("data-theme", storedTheme === "dark" ? "dark" : "light");
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    }

    // Production log, kept on purpose: the digest ties this error to the
    // matching entry in the server logs.
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html
      lang="en"
      // data-theme is set by the effect above after hydration, so the
      // attributes will differ from the server render — expected, not a bug.
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorState onRetry={retry} digest={error.digest} useHardNavigation />
      </body>
    </html>
  );
}
