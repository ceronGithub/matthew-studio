/**
 * FILE: app/layout.tsx
 * ROLE: Root layout — wraps every route in the app, public and superAdmin alike.
 *
 * PURPOSE:
 * Loads global fonts and stylesheets, and sets the default site-wide
 * metadata. Account-specific shells (nav, sidebar) live in each
 * account's own layout — never here (see app/superAdmin/layout.tsx).
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import "./styles/mediaQueries.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matthew Studio | Resort Booking Template",
  description:
    "Resort website templates with built-in multi-room booking, promos, and an admin dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
