/**
 * FILE: components/support/SupportFaqAccordion.tsx
 * ROLE: Public — FAQ section of the Support page (/support).
 *
 * PURPOSE:
 * IMPROVEMENTS.md Section 9's "FAQ Section": a search box that filters
 * SUPPORT_FAQ_ITEMS by question/answer text, grouped under three
 * category headings (General, Templates, Products) — only categories
 * with at least one matching item are rendered. Each question expands
 * independently (unlike the homepage's FAQAccordion, which only ever
 * keeps one item open at a time) since a support visitor searching for
 * something specific may want several answers open side by side.
 *
 * DATA FLOW:
 * Reads SUPPORT_FAQ_ITEMS (static, lib/supportFaqData.ts). Filtering
 * and open/closed state are both local — no fetching.
 */
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";
import { SUPPORT_FAQ_ITEMS, type SupportFaqCategory } from "@/lib/supportFaqData";

const CATEGORY_ORDER: SupportFaqCategory[] = ["General", "Templates", "Products"];

export default function SupportFaqAccordion() {
  const [searchQuery, setSearchQuery] = useState("");
  // Independent open/closed tracking per item id — a Set so toggling one
  // question never affects any other, in or out of its category group.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggleItem(id: string) {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Re-filters only when the search text changes — matches against both
  // question and answer so e.g. searching "refund" also surfaces items
  // that only mention refunds in the answer body.
  const groupedResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? SUPPORT_FAQ_ITEMS.filter(
          (item) =>
            item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query)
        )
      : SUPPORT_FAQ_ITEMS;

    return CATEGORY_ORDER.map((category) => ({
      category,
      items: filtered.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [searchQuery]);

  return (
    <section className="supportFaqSection">
      <div className="supportFaqContainer">
        <motion.div
          className="supportFaqHeader"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="sectionTitle">Frequently Asked Questions</h2>
        </motion.div>

        <div className="supportFaqSearchBar">
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search FAQs…"
            aria-label="Search FAQs"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        {groupedResults.length === 0 && (
          <p className="supportFaqEmpty">No results for &quot;{searchQuery}&quot; — try a different search term.</p>
        )}

        {groupedResults.map((group) => (
          <div key={group.category} className="supportFaqGroup">
            <h3 className="supportFaqGroupTitle">{group.category}</h3>

            <div className="faqHomeList">
              {group.items.map((item, index) => {
                const isOpen = openIds.has(item.id);

                return (
                  <motion.div
                    key={item.id}
                    className={`faqHomeItem${isOpen ? " faqHomeItemOpen" : ""}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.06 }}
                  >
                    <button
                      type="button"
                      className="faqHomeQuestion"
                      aria-expanded={isOpen}
                      aria-controls={`support-faq-answer-${item.id}`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <span>{item.question}</span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="faqHomeChevron"
                      >
                        <ChevronDown size={20} strokeWidth={2} aria-hidden="true" />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`support-faq-answer-${item.id}`}
                          role="region"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <p className="faqHomeAnswer">{item.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
