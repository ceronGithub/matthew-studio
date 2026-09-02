/**
 * FILE: components/home/FAQAccordion.tsx
 * ROLE: Public — "Frequently Asked Questions" section of the homepage.
 *
 * PURPOSE:
 * Six general marketplace questions (payment, refunds, access,
 * support, licensing, catalog cadence) in an expand/collapse
 * accordion. A "See All FAQs" CTA below links to the fuller /faq
 * page (Phase 3 of the marketplace plan — not yet built, same
 * pending-link pattern already used by FeaturedProducts → /shop and
 * HowItWorksSection → /shop, both linking ahead of their eventual
 * /products destination).
 *
 * DATA FLOW:
 * Reads HOME_FAQ_ITEMS (static, lib/homeFaqData.ts). Only one item is
 * expanded at a time — opening a new one collapses whichever was open.
 */
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { HOME_FAQ_ITEMS } from "@/lib/homeFaqData";

export default function FAQAccordion() {
  // Tracks the single open item's id — null means every item is
  // collapsed. Opening a new item closes whichever was previously open.
  const [openId, setOpenId] = useState<string | null>(null);

  // Question button refs, indexed same as HOME_FAQ_ITEMS, so ArrowUp/
  // ArrowDown can move focus directly without querying the DOM.
  const questionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * handleQuestionKeyDown
   * ArrowDown/ArrowUp move focus to the next/previous question button,
   * wrapping around at the ends (spec 7.3). Escape collapses the
   * currently open item without moving focus off the button.
   */
  function handleQuestionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const itemCount = HOME_FAQ_ITEMS.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = (index + 1) % itemCount;
      questionButtonRefs.current[nextIndex]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const previousIndex = (index - 1 + itemCount) % itemCount;
      questionButtonRefs.current[previousIndex]?.focus();
    } else if (event.key === "Escape") {
      setOpenId(null);
    }
  }

  return (
    <section className="faqHomeSection">
      <div className="faqHomeContainer">
        <motion.div
          className="faqHomeHeader"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="sectionTitle">Frequently Asked Questions</h2>
        </motion.div>

        <div className="faqHomeList">
          {HOME_FAQ_ITEMS.map((item, index) => {
            const isOpen = openId === item.id;

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
                  ref={(el) => {
                    questionButtonRefs.current[index] = el;
                  }}
                  className="faqHomeQuestion"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  onKeyDown={(event) => handleQuestionKeyDown(event, index)}
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
                      id={`faq-answer-${item.id}`}
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

        <div className="faqHomeCtaRow">
          <Link href="/faq" className="buttonSecondary">
            See All FAQs
          </Link>
        </div>
      </div>
    </section>
  );
}