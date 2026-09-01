/**
 * FILE: app/(public)/security/page.tsx
 * ROLE: Public — Security page, served at "/security".
 *
 * PURPOSE:
 * One of the 4 legal pages from improvement_1.md Section 4's
 * missing-pages list. Renders SECURITY_POLICY (lib/legalData.ts)
 * through the shared LegalDocument component.
 *
 * DATA FLOW:
 * This Server Component reads SECURITY_POLICY directly — no fetch
 * needed, it's a local static object today. Entirely static; no
 * Client Component needed on this page.
 */
import type { Metadata } from "next";
import "../../styles/legal.css";
import LegalDocument from "@/components/legal/LegalDocument";
import { SECURITY_POLICY } from "@/lib/legalData";

export const metadata: Metadata = {
  title: "Security | Matthew Studio",
  description: "How Matthew Studio protects the site, accounts, and information submitted through it.",
  openGraph: {
    title: "Security | Matthew Studio",
    description: "How Matthew Studio protects the site, accounts, and information submitted through it.",
    images: ["/og-home.png"],
  },
};

export default function SecurityPage() {
  return <LegalDocument document={SECURITY_POLICY} />;
}
