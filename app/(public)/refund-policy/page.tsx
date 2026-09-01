/**
 * FILE: app/(public)/refund-policy/page.tsx
 * ROLE: Public — Refund Policy page, served at "/refund-policy".
 *
 * PURPOSE:
 * One of the 4 legal pages from improvement_1.md Section 4's
 * missing-pages list. Renders REFUND_POLICY (lib/legalData.ts)
 * through the shared LegalDocument component.
 *
 * DATA FLOW:
 * This Server Component reads REFUND_POLICY directly — no fetch
 * needed, it's a local static object today. Entirely static; no
 * Client Component needed on this page.
 */
import type { Metadata } from "next";
import "../../styles/legal.css";
import LegalDocument from "@/components/legal/LegalDocument";
import { REFUND_POLICY } from "@/lib/legalData";

export const metadata: Metadata = {
  title: "Refund Policy | Matthew Studio",
  description: "How refunds are handled across every Matthew Studio marketplace category.",
  openGraph: {
    title: "Refund Policy | Matthew Studio",
    description: "How refunds are handled across every Matthew Studio marketplace category.",
    images: ["/og-home.png"],
  },
};

export default function RefundPolicyPage() {
  return <LegalDocument document={REFUND_POLICY} />;
}
