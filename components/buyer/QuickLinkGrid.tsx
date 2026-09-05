/**
 * FILE: components/buyer/QuickLinkGrid.tsx
 * ROLE: Buyer only — renders the four quick-start cards on
 * app/buyer/dashboard/page.tsx.
 *
 * PURPOSE:
 * buyer_homepage_specification.md §13.2 flags the dashboard's cards as
 * "Static render" needing a "fade/scale-in on data arrival" entrance,
 * same stagger pattern already used for product/category cards
 * elsewhere on the site. Since this page has no async data fetching
 * (QUICK_LINKS is static, passed down from the Server Component page),
 * "data arrival" here just means page mount — each card scales in
 * with a short per-index stagger, matching the 0.9 → 1.0 scale-in
 * pattern used for buttons/icons/cards elsewhere (Rule 4.1).
 *
 * Icons are resolved from a string key rather than passed as a
 * component reference, since only serializable props can cross the
 * Server → Client Component boundary (page.tsx stays a Server
 * Component per Rule 31.1).
 *
 * DATA FLOW:
 * Reads `links` from props (passed down from page.tsx, sourced from
 * its QUICK_LINKS constant). No data fetching of its own.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, GraduationCap, UserRound, CreditCard, Download, Package, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "shopping-bag": ShoppingBag,
  "graduation-cap": GraduationCap,
  "user-round": UserRound,
  "credit-card": CreditCard,
  download: Download,
  package: Package,
};

export interface QuickLinkItem {
  title: string;
  description: string;
  href: string;
  icon: keyof typeof ICON_MAP;
  available: boolean;
}

export default function QuickLinkGrid({ links }: { links: QuickLinkItem[] }) {
  return (
    <div className="buyerQuickLinkGrid">
      {links.map(({ title, description, href, icon, available }, index) => {
        const Icon = ICON_MAP[icon];

        const card = (
          <motion.article
            className={`buyerQuickLinkCard ${available ? "" : "buyerQuickLinkCard--soon"}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="buyerQuickLinkIcon">
              <Icon size={20} />
            </span>
            <h2 className="buyerQuickLinkTitle">{title}</h2>
            <p className="buyerQuickLinkDescription">{description}</p>
            {!available && <span className="buyerQuickLinkBadge">Coming soon</span>}
          </motion.article>
        );

        return available ? (
          <Link key={title} href={href} className="buyerQuickLinkWrapper">
            {card}
          </Link>
        ) : (
          <div key={title} className="buyerQuickLinkWrapper" aria-disabled="true">
            {card}
          </div>
        );
      })}
    </div>
  );
}
