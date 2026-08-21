/**
 * FILE: lib/testimonialsData.ts
 * PURPOSE:
 * Static placeholder testimonial content for the Testimonials page
 * (/testimonials). Quotes are attributed to the same four clients
 * already shown on /portfolio (lib/portfolioData.ts) so a visitor
 * reading a quote here can click through to that client's full case
 * study — same consistency pattern as pricingData.ts reusing
 * portfolio tags.
 *
 * DATA FLOW:
 * No database yet — replace with a superAdmin-managed `testimonials`
 * table once the admin dashboard is built (see overviewProject.txt).
 */

export interface Testimonial {
  clientSlug: string;
  clientName: string;
  personName: string;
  personRole: string;
  quote: string;
  tierTag: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    clientSlug: "cabana-bay-resort",
    clientName: "Cabana Bay Resort",
    personName: "Rina Alvarez",
    personRole: "General Manager",
    quote:
      "We used to lose same-day bookings every time the front desk closed. Now guests book at 2am and we see it the next morning — no extra staff needed.",
    tierTag: "Managed SaaS",
  },
  {
    clientSlug: "azure-point",
    clientName: "Azure Point",
    personName: "Marcus Feld",
    personRole: "Owner",
    quote:
      "I was worried a template would look like every other resort site. It doesn't — our brand colors and fonts are baked in, and guests can't tell it's not fully custom.",
    tierTag: "Self-Hosted",
  },
  {
    clientSlug: "marlin-cove",
    clientName: "Marlin Cove",
    personName: "Joyce Tan",
    personRole: "Activities Director",
    quote:
      "The add-on packages at checkout changed everything for us. Guests bundle dive trips with their room booking now, and our activities desk stopped fielding a second round of calls.",
    tierTag: "Custom Build",
  },
  {
    clientSlug: "solstice-villas",
    clientName: "Solstice Villas",
    personName: "David Ochoa",
    personRole: "Operations Manager",
    quote:
      "We had five weeks before peak season and no site. The team had us live in under 48 hours, and I never touched a line of code.",
    tierTag: "Managed SaaS",
  },
];
