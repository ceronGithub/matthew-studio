/**
 * FILE: lib/legalData.ts
 * PURPOSE:
 * Static content for the 4 legal pages from improvement_1.md Section
 * 4's missing-pages list ("/security, /privacy, /terms, /refund-
 * policy — needed before any real checkout/payment flow goes live").
 * Each export follows the same LegalDocument shape so all 4 pages can
 * share one rendering component (components/legal/LegalDocument.tsx)
 * instead of four near-duplicate page layouts.
 *
 * DATA FLOW:
 * No database yet — these are placeholder policy drafts covering the
 * site's actual current behavior (Supabase auth for the superAdmin
 * account, EmailJS-based contact form, no live payment processor yet).
 * Once a real checkout/payment flow ships, the Refund Policy and
 * Privacy Policy sections referencing payment data must be revisited.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "September 1, 2026",
  intro:
    "This policy explains what information Matthew Studio collects when you browse the marketplace, submit the contact form, or manage the site as a superAdmin, and how that information is used.",
  sections: [
    {
      heading: "Information We Collect",
      body: [
        "When you use the contact form, we collect the name, email address, category of interest, and message you provide, so we can respond to your inquiry.",
        "For the superAdmin account, we collect an email and password, authenticated through Supabase. This access is restricted to site administrators only.",
        "We do not currently operate a checkout or payment flow, so no payment card details are collected or stored by this site.",
      ],
    },
    {
      heading: "How We Use Information",
      body: [
        "Contact form submissions are used solely to respond to your inquiry about a product category or custom request.",
        "We do not sell, rent, or share your personal information with third parties for marketing purposes.",
      ],
    },
    {
      heading: "Cookies & Analytics",
      body: [
        "This site does not currently use tracking cookies or third-party analytics scripts. If that changes, this policy will be updated to disclose what is collected and why.",
      ],
    },
    {
      heading: "Data Retention",
      body: [
        "Contact form submissions are retained only as long as needed to respond to and resolve your inquiry.",
      ],
    },
    {
      heading: "Contact Us",
      body: [
        "Questions about this policy can be sent through the /contact page.",
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  lastUpdated: "September 1, 2026",
  intro:
    "These terms govern your use of the Matthew Studio marketplace website, including browsing products, submitting inquiries, and any future purchases.",
  sections: [
    {
      heading: "Use of the Site",
      body: [
        "You may browse product listings across all 6 marketplace categories (Templates, T-Shirts, AI Videos, File Tools, Tutorials, Game Characters) for personal or business evaluation purposes.",
        "You agree not to misuse the site, including attempting to access the superAdmin dashboard without authorization or submitting the contact form for spam or abusive purposes.",
      ],
    },
    {
      heading: "Product Listings & Pricing",
      body: [
        "Prices shown on product and pricing pages are starting prices and may vary based on the variant, tier, or customization you select.",
        "We reserve the right to update product listings, pricing, and availability at any time without prior notice.",
      ],
    },
    {
      heading: "Intellectual Property",
      body: [
        "All templates, designs, video assets, tools, tutorials, and character assets sold through this marketplace remain the intellectual property of Matthew Studio unless otherwise licensed at the time of purchase.",
      ],
    },
    {
      heading: "Limitation of Liability",
      body: [
        "Matthew Studio provides products and services \"as is.\" We are not liable for indirect or consequential damages arising from the use of any purchased product.",
      ],
    },
    {
      heading: "Changes to These Terms",
      body: [
        "We may update these terms from time to time. Continued use of the site after changes are posted constitutes acceptance of the updated terms.",
      ],
    },
  ],
};

export const SECURITY_POLICY: LegalDocument = {
  title: "Security",
  lastUpdated: "September 1, 2026",
  intro:
    "An overview of how Matthew Studio protects the site and any information submitted through it.",
  sections: [
    {
      heading: "Account Protection",
      body: [
        "The superAdmin dashboard is protected by Supabase authentication, with access limited to authorized administrator accounts only.",
        "Admin routes are guarded server-side, not just hidden in the UI — a visitor without the correct role cannot reach admin pages by guessing a URL.",
      ],
    },
    {
      heading: "Data in Transit",
      body: [
        "The site is served over HTTPS, encrypting all traffic between your browser and our servers.",
      ],
    },
    {
      heading: "Payment Security",
      body: [
        "This site does not currently process payments directly. Once a checkout flow is introduced, payment data will be handled through a PCI-compliant payment processor, and this section will be updated with the specifics.",
      ],
    },
    {
      heading: "Reporting a Security Concern",
      body: [
        "If you believe you've found a security issue with this site, please reach out through the /contact page so we can investigate promptly.",
      ],
    },
  ],
};

export const REFUND_POLICY: LegalDocument = {
  title: "Refund Policy",
  lastUpdated: "September 1, 2026",
  intro:
    "This policy outlines how refunds are handled for products purchased through Matthew Studio, across all 6 marketplace categories.",
  sections: [
    {
      heading: "Digital Products",
      body: [
        "Because most products in this marketplace (Templates, AI Videos, File Tools, Tutorials, Game Characters) are digital and delivered instantly, refunds are evaluated on a case-by-case basis rather than guaranteed.",
        "If a digital product is materially different from its listing description or fails to function as described, contact us within 7 days of purchase for a review.",
      ],
    },
    {
      heading: "T-Shirts (Physical Products)",
      body: [
        "Physical apparel orders may be returned within 14 days of delivery if unworn and in original condition, for a size or design exchange or a refund minus shipping costs.",
      ],
    },
    {
      heading: "Custom & Managed Template Work",
      body: [
        "Custom-built or managed template engagements are billed per the terms agreed at the start of the project. Refunds for work already completed are handled individually based on the scope delivered.",
      ],
    },
    {
      heading: "How to Request a Refund",
      body: [
        "Submit a request through the /contact page with your order details and the reason for the request. We aim to respond within 3 business days.",
      ],
    },
  ],
};
