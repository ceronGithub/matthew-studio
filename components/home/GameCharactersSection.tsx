/**
 * FILE: components/home/GameCharactersSection.tsx
 * ROLE: Public — homepage section for the Game Characters category
 * (IMPROVEMENTS.md Section 4F). Purpose: "Visual showcase.
 * Gallery-driven discovery." — the other light section, built around
 * a clickable thumbnail grid rather than a comparison table or video.
 *
 * PURPOSE:
 * Header, a 9-thumbnail character gallery grid (spec calls for 6-9)
 * that opens a full-view lightbox on click — keyboard arrow-key
 * navigation between characters, Escape to close, per spec's
 * "Lightbox modal: Click to expand full-res view, navigate with
 * arrow keys" — product cards tagged Rigged/Modular/Low-poly, and a
 * CTA.
 *
 * DATA FLOW:
 * Reads GAME_CHARACTER_GALLERY/GAME_CHARACTER_PRODUCT_TAGS
 * (gameCharactersSectionData.ts) and PRODUCTS (productsData.ts)
 * filtered to category "game-characters". No real character renders
 * exist yet, so both the grid thumbnails and the lightbox show a
 * tinted gradient placeholder (Rule 27 — swap for real renders once
 * available).
 */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeader from "@/components/shared/SectionHeader";
import ProductCard from "@/components/home/ProductCard";
import { PRODUCTS } from "@/lib/productsData";
import { GAME_CHARACTER_GALLERY, GAME_CHARACTER_PRODUCT_TAGS } from "@/lib/gameCharactersSectionData";

const GAME_CHARACTER_PRODUCTS = PRODUCTS.filter((product) => product.category === "game-characters");

// Parent container drives the stagger timing; each thumbnail just fades + scales in
// (Section 4F: "Entrance: Stagger fade + scale (0.1s between items)").
const galleryContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const galleryItemVariants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
};

function CharacterLightbox({ activeIndex, onClose, onNavigate }: { activeIndex: number; onClose: () => void; onNavigate: (index: number) => void }) {
  const character = GAME_CHARACTER_GALLERY[activeIndex];

  // Keyboard navigation: Left/Right arrows move between characters, Escape closes —
  // matches spec's "navigate with arrow keys" requirement for the lightbox.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onNavigate((activeIndex - 1 + GAME_CHARACTER_GALLERY.length) % GAME_CHARACTER_GALLERY.length);
      if (event.key === "ArrowRight") onNavigate((activeIndex + 1) % GAME_CHARACTER_GALLERY.length);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, onClose, onNavigate]);

  return (
    <motion.div
      className="characterLightboxBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${character.name} — full view`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onClick={onClose}
    >
      <motion.div
        className="characterLightboxDialog"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="characterLightboxClose" aria-label="Close" onClick={onClose}>
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>

        <div className={`characterLightboxImage characterLightboxImage${character.tintVariant}`} />

        <div className="characterLightboxCaption">
          <span className="characterLightboxName">{character.name}</span>
          <span className="characterLightboxTag">{character.tag}</span>
        </div>

        <button
          type="button"
          className="characterLightboxArrow characterLightboxArrowPrev"
          aria-label="Previous character"
          onClick={() => onNavigate((activeIndex - 1 + GAME_CHARACTER_GALLERY.length) % GAME_CHARACTER_GALLERY.length)}
        >
          <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="characterLightboxArrow characterLightboxArrowNext"
          aria-label="Next character"
          onClick={() => onNavigate((activeIndex + 1) % GAME_CHARACTER_GALLERY.length)}
        >
          <ChevronRight size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function GameCharactersSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <section className="categorySection">
      <div className="sectionContainer">
        <SectionHeader eyebrow="Game Characters" title="3D ready game characters" subtitle="Rigged, modular, and low-poly sets — export straight into your engine." />

        <motion.div className="characterGrid" variants={galleryContainerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          {GAME_CHARACTER_GALLERY.map((character, index) => (
            <motion.button
              type="button"
              key={character.id}
              className="characterThumb"
              variants={galleryItemVariants}
              onClick={() => setActiveIndex(index)}
              aria-label={`View ${character.name}`}
            >
              <div className={`characterThumbImage characterThumbImage${character.tintVariant}`} />
              <div className="characterThumbOverlay">
                <span className="characterThumbName">{character.name}</span>
                <span className="characterThumbView">View</span>
              </div>
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence>
          {activeIndex !== null && <CharacterLightbox activeIndex={activeIndex} onClose={() => setActiveIndex(null)} onNavigate={setActiveIndex} />}
        </AnimatePresence>

        <div className="productCardsGrid">
          {GAME_CHARACTER_PRODUCTS.map((product) => (
            <div className="gameCharacterCardWrap" key={product.id}>
              <span className="characterTagBadge">{GAME_CHARACTER_PRODUCT_TAGS[product.id]}</span>
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <div className="sectionCTA">
          <a href="/shop?category=game-characters" className="buttonPrimary">
            View All Characters
          </a>
        </div>
      </div>
    </section>
  );
}
