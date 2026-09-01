/**
 * FILE: app/(public)/faq/page.tsx
 * ROLE: Public — redirect-only route, served at "/faq".
 *
 * PURPOSE:
 * improvement_1.md Section 4 lists "/faq" as a missing marketplace
 * page. It isn't actually missing content-wise: "/support" already
 * ships a searchable, category-grouped FAQ accordion
 * (SupportFaqAccordion, backed by lib/supportFaqData.ts) alongside
 * the support contact form, and NavBar already links "Support" there
 * — not to a separate "/faq". Building a second, parallel FAQ page
 * would just fork the content in two places. Instead, "/faq" exists
 * purely so that URL resolves for anyone typing/linking it directly,
 * same retirement pattern as app/(public)/shop/page.tsx → /pricing.
 *
 * DATA FLOW:
 * No content rendered — redirect() throws immediately on request,
 * before any component body executes.
 */
import { redirect } from "next/navigation";

export default function FaqPage() {
  redirect("/support");
}
