/**
 * FILE: app/(public)/support/page.tsx
 * ROLE: Public — Support & FAQ page, served at "/support".
 *
 * PURPOSE:
 * IMPROVEMENTS.md Section 9. Two sections: a lightweight contact form
 * (SupportForm, posts to /api/support) for anything not answered
 * below, and a searchable, category-grouped FAQ accordion
 * (SupportFaqAccordion). Linked from the navbar's "Support" item
 * (components/shared/NavBar.tsx) — distinct from /contact, which is
 * specifically the Get-a-Demo / sales page.
 *
 * DATA FLOW:
 * Both sections are self-contained Client Components; this page
 * itself stays a Server Component so it can export static metadata.
 */
import type { Metadata } from "next";
import "../../styles/contact.css";
import "../../styles/home.css";
import "../../styles/support.css";
import SupportForm from "@/components/support/SupportForm";
import SupportFaqAccordion from "@/components/support/SupportFaqAccordion";

export const metadata: Metadata = {
  title: "Support & FAQ | Matthew Studio",
  description: "Get help with an order, ask a question, or browse answers to common questions.",
  openGraph: {
    title: "Support & FAQ | Matthew Studio",
    description: "Get help with an order, ask a question, or browse answers to common questions.",
    images: ["/og-support.png"],
  },
};

export default function SupportPage() {
  return (
    <>
      <header className="supportPageHeader">
        <div className="supportPageHeaderInner">
          <p className="eyebrow">We&apos;re here to help</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Support &amp; FAQ
          </h1>
          <p className="heroSubtitle">
            Send us a message, or check the answers below — most questions are covered already.
          </p>
        </div>
      </header>

      <section className="supportContactSection">
        <div className="supportContactSectionInner">
          <SupportForm />
        </div>
      </section>

      <SupportFaqAccordion />
    </>
  );
}
