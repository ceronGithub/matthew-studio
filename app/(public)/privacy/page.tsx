/**
 * FILE: app/(public)/privacy/page.tsx
 * ROLE: Public — Privacy Policy page, served at "/privacy".
 *
 * PURPOSE:
 * One of the 4 legal pages from improvement_1.md Section 4's
 * missing-pages list. Renders PRIVACY_POLICY (lib/legalData.ts)
 * through the shared LegalDocument component.
 *
 * DATA FLOW:
 * This Server Component reads PRIVACY_POLICY directly — no fetch
 * needed, it's a local static object today. Entirely static; no
 * Client Component needed on this page.
 */
import type { Metadata } from "next";
import "../../styles/legal.css";
import LegalDocument from "@/components/legal/LegalDocument";
import { PRIVACY_POLICY } from "@/lib/legalData";

export const metadata: Metadata = {
  title: "Privacy Policy | Matthew Studio",
  description:
    "How Matthew Studio collects, uses, and protects information submitted through the marketplace site.",
  openGraph: {
    title: "Privacy Policy | Matthew Studio",
    description:
      "How Matthew Studio collects, uses, and protects information submitted through the marketplace site.",
    images: ["/og-home.png"],
  },
};

export default function PrivacyPage() {
  return <LegalDocument document={PRIVACY_POLICY} />;
}
