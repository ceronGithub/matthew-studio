/**
 * FILE: lib/slugGenerator.ts
 * PURPOSE:
 * Low-level, cryptographically random component generators for the
 * Vault session-slug and vault-credentials system
 * (vault_specification.md Sections 2.2/2.3/3.1). This file has no
 * knowledge of AdminSession/VaultCredentials or Prisma — it only
 * produces raw components. lib/vaultHelpers.ts composes these into
 * the actual slug/credentials shapes and handles persistence.
 *
 * RANDOMNESS: the spec (Section 8.1) calls for `crypto.getRandomValues()`
 * (the browser Web Crypto API) rather than `Math.random()`. This code
 * runs server-side (API routes / login flow), so it uses Node's
 * built-in `crypto.randomInt()` instead — Node's CSPRNG equivalent.
 * Same security property (cryptographically secure, not Math.random),
 * different API surface because this never runs in a browser context.
 *
 * WORD SOURCE: the spec describes "BIP39 word list (1,624 standard
 * words)". The real, standard BIP39 English wordlist (from the `bip39`
 * npm package) has 2,048 words — the spec's count appears to be a
 * documentation error, not an intentional smaller list. Using the
 * real, standard 2,048-word list here rather than fabricating a
 * shorter one, since "BIP39 word list" is otherwise an exact,
 * well-known reference.
 */
import { randomInt } from "crypto";
import { wordlists } from "bip39";

const BIP39_WORDS = wordlists.english;

const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const DIGIT_CHARS = "0123456789";
const SPECIAL_CHARS = "!@#$%^&*-_+=";
const ALPHANUMERIC_CHARS = UPPERCASE_CHARS + LOWERCASE_CHARS + DIGIT_CHARS;

/**
 * pickRandomChar
 * Picks one character from the given charset using a CSPRNG index —
 * never Math.random(), per Rule 18/Section 8.1.
 */
function pickRandomChar(charset: string): string {
  return charset[randomInt(0, charset.length)];
}

/**
 * shuffle
 * In-place Fisher-Yates shuffle using CSPRNG swaps. Used so the final
 * component string/array isn't predictably grouped (e.g. all
 * uppercase first, then all lowercase) even though it was built up
 * in grouped batches.
 */
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * generateWords
 * Picks `count` distinct random words from the BIP39 wordlist (no
 * duplicates within one call) using CSPRNG-driven sampling.
 * Used for: super-admin slug (12), admin slug (7), vault credentials (15).
 */
export function generateWords(count: number): string[] {
  if (count > BIP39_WORDS.length) {
    throw new Error(
      `generateWords: requested ${count} words but the wordlist only has ${BIP39_WORDS.length}`
    );
  }

  // Partial Fisher-Yates over a copy of the wordlist — stops after
  // `count` swaps instead of shuffling all 2048 entries every time.
  const pool = [...BIP39_WORDS];
  const selected: string[] = [];

  for (let i = 0; i < count; i++) {
    const remaining = pool.length - i;
    const swapIndex = i + randomInt(0, remaining);
    [pool[i], pool[swapIndex]] = [pool[swapIndex], pool[i]];
    selected.push(pool[i]);
  }

  return selected;
}

/**
 * generateAlphanumeric
 * Produces a `count`-length string drawn from {A-Z, a-z, 0-9}, split
 * as evenly as possible across the three charsets (extras assigned
 * round-robin), then shuffled so the output isn't grouped by type.
 *
 * This single even-split algorithm satisfies both documented cases:
 *   - Super-admin (12): 4 upper / 4 lower / 4 digit — exact thirds
 *   - Admin (7): "even spread" — 3/2/2 in some order
 *   - Vault credentials (15): 5 upper / 5 lower / 5 digit — exact thirds
 */
export function generateAlphanumeric(count: number): string {
  const charsetGroups = [UPPERCASE_CHARS, LOWERCASE_CHARS, DIGIT_CHARS];
  const chars = distributeAcrossCharsets(count, charsetGroups);
  return shuffle(chars).join("");
}

/**
 * generateAlphaspecial
 * Produces a `count`-length string that is 50% alphanumeric
 * characters and 50% special characters (Section 2.2/2.3's
 * "alphaspecial" component). When `count` is odd, the alphanumeric
 * half gets the extra character (ceil), special gets the remainder
 * (floor) — e.g. count=7 → 4 alphanumeric + 3 special.
 */
export function generateAlphaspecial(count: number): string {
  const alphanumericCount = Math.ceil(count / 2);
  const specialCount = Math.floor(count / 2);

  const chars: string[] = [];
  for (let i = 0; i < alphanumericCount; i++) chars.push(pickRandomChar(ALPHANUMERIC_CHARS));
  for (let i = 0; i < specialCount; i++) chars.push(pickRandomChar(SPECIAL_CHARS));

  return shuffle(chars).join("");
}

/**
 * distributeAcrossCharsets
 * Splits `count` characters as evenly as possible across the given
 * charset groups (in order), assigning any remainder one-at-a-time
 * to the earliest groups. Returns the flat, ungrouped char array —
 * caller is expected to shuffle before joining.
 */
function distributeAcrossCharsets(count: number, charsetGroups: string[]): string[] {
  const baseCount = Math.floor(count / charsetGroups.length);
  const remainder = count % charsetGroups.length;

  const chars: string[] = [];
  charsetGroups.forEach((charset, groupIndex) => {
    // Earliest groups absorb the remainder, one extra char each.
    const thisGroupCount = baseCount + (groupIndex < remainder ? 1 : 0);
    for (let i = 0; i < thisGroupCount; i++) chars.push(pickRandomChar(charset));
  });

  return chars;
}
