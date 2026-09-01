/**
 * FILE: app/(public)/terms/page.tsx
 * ROLE: Public — Terms of Service page, served at "/terms".
 *
 * PURPOSE:
 * One of the 4 legal pages from improvement_1.md Section 4's
 * missing-pages list. Renders TERMS_OF_SERVICE (lib/legalData.ts)
 * through the shared LegalDocument component.
 *
 * DATA FLOW:
 * This Server Component reads TERMS_OF_SERVICE directly — no fetch
 * needed, it's a local static object today. Entirely static; no
 * Client Component needed on this page.
 */
import type { Metadata } from "next";
import "../../styles/legal.css";
import LegalDocument from "@/components/legal/LegalDocument";
import { TERMS_OF_SERVICE } from "@/lib/legalData";

export const metadata: Metadata = {
  title: "Terms of Service | Matthew Studio",
  description: "The terms governing your use of the Matthew Studio marketplace site.",
  openGraph: {
    title: "Terms of Service | Matthew Studio",
    description: "The terms governing your use of the Matthew Studio marketplace site.",
    images: ["/og-home.png"],
  },
};

export default function TermsPage() {
  return <LegalDocument document={TERMS_OF_SERVICE} />;
}
