/**
 * FILE: app/layout.tsx
 * ROLE: Root layout — wraps every route in the app, public and superAdmin alike.
 *
 * PURPOSE:
 * Loads global fonts and stylesheets, and sets the default site-wide
 * metadata. Account-specific shells (nav, sidebar) live in each
 * account's own layout — never here (see app/superAdmin/layout.tsx).
 *
 * Also wraps every page in ThemeProvider (context/ThemeContext.tsx)
 * for the light/dark theme toggle, and runs a tiny anti-flash script
 * before hydration so the correct theme is already applied to <html>
 * on first paint — without it, the page would flash light-then-dark
 * (or vice versa) for returning visitors who chose dark mode.
 */
import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./styles/globals.css";
import "./styles/mediaQueries.css";
import { ThemeProvider } from "@/context/ThemeContext";

// Reads the persisted theme choice and applies it to <html> before
// React hydrates. Wrapped in try/catch so a blocked localStorage
// (privacy mode, some browser extensions) never breaks page load —
// it just falls back to the light theme in that case.
const THEME_INIT_SCRIPT = `(function() {
  try {
    var stored = localStorage.getItem("matthewStudioTheme");
    var theme = stored === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();`;

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
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
