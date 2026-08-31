/**
 * FILE: lib/homeFaqData.ts
 * PURPOSE:
 * Static content for the homepage's FAQ Accordion — six marketplace-
 * wide questions (payment, refunds, access, support, licensing,
 * catalog cadence), per the homepage spec's example question list.
 * A dedicated "See All FAQs" CTA below the accordion links to /faq
 * for the fuller, per-category FAQ page (Phase 3 of the marketplace
 * plan, not yet built).
 *
 * DATA FLOW:
 * Imported by components/home/FAQAccordion.tsx. No database yet —
 * replace with a superAdmin-managed `faq` table once the admin
 * dashboard is built (see overviewProject.txt).
 */

export interface HomeFaqItem {
  id: string;
  question: string;
  answer: string;
}

export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    id: "payment-methods",
    question: "What payment methods do you accept?",
    answer:
      "We accept major credit and debit cards, GCash, and bank transfer at checkout. Managed SaaS tiers are billed monthly or annually; one-time products (t-shirts, file tools, tutorials) are a single charge.",
  },
  {
    id: "refunds",
    question: "Can I get a refund?",
    answer:
      "Yes — digital products come with a 30-day refund window if they don't work as described. Physical products (t-shirts) can be returned within 14 days of delivery, unworn and in original packaging.",
  },
  {
    id: "access-time",
    question: "How long does it take to access after purchase?",
    answer:
      "Digital products (templates, AI videos, file tools, tutorials, game characters) unlock instantly after checkout. Physical products (t-shirts) ship within 2-3 business days.",
  },
  {
    id: "support",
    question: "Do you offer support?",
    answer:
      "Every purchase includes email support. Managed SaaS tiers also get priority chat support, and Custom Build clients get a dedicated point of contact for the length of the engagement.",
  },
  {
    id: "commercial-use",
    question: "Can I use these for commercial purposes?",
    answer:
      "Most products include a commercial-use license by default — check the license tab on each product page, since terms vary slightly for Game Characters and AI Video templates.",
  },
  {
    id: "new-products",
    question: "How often do you add new products?",
    answer:
      "We ship new products most weeks across the six categories. Sort any category page by \"Newest\" to see what just landed, or check the Bestsellers carousel on the homepage.",
  },
];
