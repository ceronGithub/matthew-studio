/**
 * FILE: lib/supportFaqData.ts
 * PURPOSE:
 * Static content for the /support page's FAQ accordion
 * (IMPROVEMENTS.md Section 9) — questions grouped into three
 * categories (General, Templates, Products) so the accordion can
 * render them under category headings and the search box can filter
 * across all three at once. Distinct from lib/homeFaqData.ts, which
 * powers the shorter, ungrouped homepage FAQ teaser — this is the
 * fuller reference list support visitors land on.
 *
 * DATA FLOW:
 * Imported by components/support/SupportFaqAccordion.tsx only. No
 * database yet — replace with a superAdmin-managed `faq` table once
 * the admin dashboard is built (see overviewProject.txt).
 */

export type SupportFaqCategory = "General" | "Templates" | "Products";

export interface SupportFaqItem {
  id: string;
  category: SupportFaqCategory;
  question: string;
  answer: string;
}

export const SUPPORT_FAQ_ITEMS: SupportFaqItem[] = [
  // ---------------------------------------------------------------
  // GENERAL
  // ---------------------------------------------------------------
  {
    id: "payment-methods",
    category: "General",
    question: "What payment methods do you accept?",
    answer:
      "We accept major credit and debit cards, GCash, and bank transfer at checkout. Managed SaaS tiers are billed monthly or annually; one-time products (t-shirts, file tools, tutorials) are a single charge.",
  },
  {
    id: "refunds",
    category: "General",
    question: "Can I get a refund?",
    answer:
      "Yes — digital products come with a 30-day refund window if they don't work as described. Physical products (t-shirts) can be returned within 14 days of delivery, unworn and in original packaging.",
  },
  {
    id: "response-time",
    category: "General",
    question: "How long until I hear back from support?",
    answer:
      "Email support replies within one business day. Managed SaaS tiers get priority chat support with faster turnaround, and Custom Build clients have a dedicated point of contact.",
  },
  {
    id: "account-access",
    category: "General",
    question: "I can't log in / access my purchase — what do I do?",
    answer:
      "First, check that you're using the same email you checked out with. If it still doesn't work, send us a message below with your order email and we'll sort out access manually.",
  },

  // ---------------------------------------------------------------
  // TEMPLATES
  // ---------------------------------------------------------------
  {
    id: "templates-tiers",
    category: "Templates",
    question: "What's the difference between Managed, Self-Hosted, and Custom?",
    answer:
      "Managed is a monthly/annual subscription — we host and maintain it for you. Self-Hosted is a one-time purchase of the source code, hosted wherever you like. Custom is a bespoke build with a dedicated engineer, priced per project.",
  },
  {
    id: "templates-customization",
    category: "Templates",
    question: "Can I customize a template after buying it?",
    answer:
      "Self-Hosted and Custom tiers include full source code, so you (or your developer) can change anything. Managed tiers support content/branding changes through the built-in dashboard; deeper structural changes require upgrading to Self-Hosted.",
  },
  {
    id: "templates-launch-time",
    category: "Templates",
    question: "How fast can a template go live?",
    answer:
      "Managed and Self-Hosted templates are typically live within 48 hours of purchase once you've sent your branding assets and content. Custom builds are scoped individually — we'll give you a timeline before you commit.",
  },

  // ---------------------------------------------------------------
  // PRODUCTS
  // ---------------------------------------------------------------
  {
    id: "products-delivery",
    category: "Products",
    question: "How long does it take to receive my order?",
    answer:
      "Digital products (templates, AI videos, file tools, tutorials, game characters) unlock instantly after checkout. Physical products (t-shirts) ship within 2-3 business days.",
  },
  {
    id: "products-commercial-use",
    category: "Products",
    question: "Can I use these for commercial purposes?",
    answer:
      "Most products include a commercial-use license by default — check the license tab on each product page, since terms vary slightly for Game Characters and AI Video templates.",
  },
  {
    id: "products-new-drops",
    category: "Products",
    question: "How often do you add new products?",
    answer:
      "We ship new products most weeks across the six categories. Sort any category page by \"Newest\" to see what just landed, or check the Bestsellers carousel on the homepage.",
  },
  {
    id: "products-tshirt-sizing",
    category: "Products",
    question: "What if a t-shirt doesn't fit?",
    answer:
      "Check the size chart on the product page before ordering — if it still doesn't fit, unworn items in original packaging can be exchanged or refunded within 14 days of delivery.",
  },
];
