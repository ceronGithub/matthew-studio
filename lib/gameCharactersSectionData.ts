/**
 * FILE: lib/gameCharactersSectionData.ts
 * PURPOSE:
 * Static placeholder content for the homepage's Game Characters
 * section (IMPROVEMENTS.md Section 4F): the 6-thumbnail character
 * gallery grid that opens into a lightbox. Product cards reuse the
 * "game-characters" category items already in lib/productsData.ts —
 * this file only holds the gallery thumbnails and their per-item
 * "Rigged / Modular / Low-poly" tag used on both the thumbnail and
 * the matching product card badge.
 *
 * DATA FLOW:
 * Imported by components/home/GameCharactersSection.tsx only. No
 * real character renders exist yet, so each thumbnail shows a tinted
 * gradient placeholder (same pattern as tshirtsSectionData.ts) swapped
 * for a real image once renders exist (Rule 27).
 */

export type CharacterTag = "Rigged" | "Modular" | "Low-poly";

export interface GameCharacterGalleryItem {
  id: string;
  name: string;
  tag: CharacterTag;
  /** 0-2, picks which of the 3 placeholder gradient tints to use. */
  tintVariant: 0 | 1 | 2;
}

export const GAME_CHARACTER_GALLERY: GameCharacterGalleryItem[] = [
  { id: "hero-knight", name: "Hero Knight", tag: "Rigged", tintVariant: 0 },
  { id: "shadow-rogue", name: "Shadow Rogue", tag: "Rigged", tintVariant: 1 },
  { id: "storm-mage", name: "Storm Mage", tag: "Rigged", tintVariant: 2 },
  { id: "riot-trooper", name: "Riot Trooper", tag: "Modular", tintVariant: 0 },
  { id: "heavy-gunner", name: "Heavy Gunner", tag: "Modular", tintVariant: 1 },
  { id: "field-medic", name: "Field Medic", tag: "Modular", tintVariant: 2 },
  { id: "swamp-critter", name: "Swamp Critter", tag: "Low-poly", tintVariant: 0 },
  { id: "sky-wisp", name: "Sky Wisp", tag: "Low-poly", tintVariant: 1 },
  { id: "cave-lurker", name: "Cave Lurker", tag: "Low-poly", tintVariant: 2 },
];

/**
 * Maps a product id (lib/productsData.ts, category "game-characters")
 * to its "Rigged / Modular / Low-poly" tag, per spec's "Product Cards:
 * Same structure, with Rigged/Modular/Low-poly badges." One tag per
 * product — matches the product's own description (e.g. the soldier
 * pack is explicitly "modular" in its copy).
 */
export const GAME_CHARACTER_PRODUCT_TAGS: Record<string, CharacterTag> = {
  "fantasy-hero-rig": "Rigged",
  "sci-fi-soldier-pack": "Modular",
  "low-poly-creature-set": "Low-poly",
};
