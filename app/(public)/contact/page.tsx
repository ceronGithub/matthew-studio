/**
 * FILE: app/(public)/contact/page.tsx
 * ROLE: Public — Contact/Get Demo page, served at "/contact".
 *
 * PURPOSE:
 * Item 8 of the build plan. Two ways to reach out: fill in ContactForm
 * (posts to /api/contact), or book a live walkthrough call directly
 * via CALENDAR_BOOKING_URL. Marketplace-wide — the form asks which
 * category a visitor is interested in, and only shows the Templates
 * tier field once Templates is picked (per improvement_1.md Section 3).
 * This is the landing page for every "Get Started" CTA across
 * categories (?tier=[slug] pre-selects the Templates tier) and the
 * ROI calculator's next step on /features.
 *
 * DATA FLOW:
 * ContactForm is a Client Component (needs useState + useSearchParams
 * for the ?tier=/?category= prefill) — everything else on this page
 * is static.
 *
 * MOTION:
 * Header and the calendar-booking block each get a single ScrollReveal
 * entrance fade (visitor_specification.md §3.1/§3.6, §6 — "motion here
 * stays minimal/functional, not decorative"). ContactForm's own field
 * focus/validation states are left untouched — no stagger or card
 * motion added to the form itself, per §6's explicit note for this page.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import "../../styles/contact.css";
import ContactForm from "@/components/contact/ContactForm";
import { CALENDAR_BOOKING_URL } from "@/lib/contactData";
import ScrollReveal from "@/components/shared/ScrollReveal";

export const metadata: Metadata = {
  title: "Contact | Matthew Studio",
  description: "Get in touch about any category — send a message or book a walkthrough call.",
  openGraph: {
    title: "Contact | Matthew Studio",
    description: "Get in touch about any category — send a message or book a walkthrough call.",
    images: ["/og-contact.png"],
  },
};

export default function ContactPage() {
  return (
    <>
      <header className="contactPageHeader">
        <ScrollReveal className="contactPageHeaderInner">
          <p className="eyebrow">Get in Touch</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Let&apos;s talk about what you need
          </h1>
          <p className="heroSubtitle">
            Send a message with what you&apos;re looking for, or book a live walkthrough call if
            you&apos;d rather talk it through.
          </p>
        </ScrollReveal>
      </header>

      <section className="contactSection">
        <div className="contactSectionInner">
          <ScrollReveal className="contactCalendarBlock">
            <CalendarDays size={22} strokeWidth={1.75} aria-hidden="true" />
            <div>
              <p className="contactCalendarTitle">Prefer to talk it through?</p>
              <p className="contactCalendarText">
                Book a 20-minute walkthrough call — see the template live and ask questions
                directly.
              </p>
            </div>
            <a
              href={CALENDAR_BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="buttonSecondary"
            >
              Book a call
            </a>
          </ScrollReveal>

          {/* useSearchParams requires a Suspense boundary around the Client Component */}
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}
