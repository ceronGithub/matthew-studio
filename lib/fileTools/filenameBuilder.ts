/**
 * FILE: lib/fileTools/filenameBuilder.ts
 * ROLE: Public File Tools — Bulk File Converter, "Rename by Invoice" mode.
 *
 * PURPOSE:
 * Turns a rename pattern such as "Invoice-{invoiceNumber}-{date}.pdf" plus
 * the fields read from an invoice into a safe filename, and makes sure a
 * batch of generated filenames never contains two identical names.
 * Pure functions only — no React, no DOM, no network — so the preview table
 * (task-49g) and the download step (task-49h) can both call it.
 *
 * DATA FLOW:
 * 1. Caller passes the pattern and the invoice fields (raw values, as read
 *    from the PDF or typed by the user).
 * 2. buildFilename() cleans each value, fills the pattern, returns a name.
 * 3. dedupeFilenames() takes every name in the batch and suffixes repeats.
 *
 * The raw values are never changed here — callers keep them so the preview
 * table can show "what was detected" next to "what the filename became".
 */

/** The values a pattern token can be replaced with. All optional because extraction can miss any of them. */
export interface FilenameTokens {
  invoiceNumber?: string;
  date?: string;
  client?: string;
}

/** Default pattern from the spec (Section 3.2). */
export const defaultRenamePattern = "Invoice-{invoiceNumber}-{date}.pdf";

// Name used when a pattern produces nothing at all (every token empty).
const fallbackBaseName = "unnamed";

// Most filesystems cap a filename at 255 characters; the extension and a
// possible "-2" dedupe suffix need room too, so the base is cut well short.
const maxBaseNameLength = 200;

/**
 * sanitizeFilenamePart
 * Removes characters that are not allowed in filenames on Windows, macOS
 * or Linux (/ \ : * ? " < > | and control characters), collapses runs of
 * spaces, and trims spaces and dots from both ends (Windows rejects names
 * that end with a dot or space).
 */
export function sanitizeFilenamePart(value: string): string {
  const withoutControlCharacters = Array.from(value)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join("");

  return withoutControlCharacters
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "");
}

/**
 * splitExtension
 * Splits "report.final.pdf" into { baseName: "report.final", extension: ".pdf" }.
 * A leading dot (".gitignore") is treated as part of the base name, and a
 * name with no dot returns an empty extension.
 */
function splitExtension(fileName: string): { baseName: string; extension: string } {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return { baseName: fileName, extension: "" };
  }
  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex),
  };
}

/**
 * buildFilename
 * Fills a rename pattern with invoice fields and returns a safe filename.
 *
 * - Every value is run through sanitizeFilenamePart() first.
 * - A token with no value (missing or empty after cleaning) is dropped
 *   together with the single separator (-, _ or space) just before it, so
 *   "Invoice-{invoiceNumber}-{date}.pdf" with no date gives
 *   "Invoice-INV-2026-0142.pdf" instead of "Invoice-INV-2026-0142-.pdf".
 *   (Assumption — the spec does not say; swap for a placeholder if wanted.)
 * - Unknown token names in the pattern are treated as empty.
 * - The extension is kept exactly as written in the pattern.
 */
export function buildFilename(pattern: string, tokens: FilenameTokens): string {
  const { baseName: patternBaseName, extension } = splitExtension(pattern);

  // Match an optional single separator followed by a {tokenName}.
  const filledBaseName = patternBaseName.replace(
    /([-_ ]?)\{(\w+)\}/g,
    (_match, separator: string, tokenName: string) => {
      const rawValue = tokens[tokenName as keyof FilenameTokens] ?? "";
      const cleanValue = sanitizeFilenamePart(rawValue);
      return cleanValue ? `${separator}${cleanValue}` : "";
    }
  );

  // A dropped first token can leave a separator at the very start or end.
  const trimmedBaseName = sanitizeFilenamePart(
    filledBaseName.replace(/^[-_ ]+|[-_ ]+$/g, "")
  ).slice(0, maxBaseNameLength);

  const safeExtension = sanitizeFilenamePart(extension.replace(/^\./, ""));
  const finalExtension = safeExtension ? `.${safeExtension}` : "";

  return `${trimmedBaseName || fallbackBaseName}${finalExtension}`;
}

/**
 * dedupeFilenames
 * Returns a new array, same order and length, where repeated names get a
 * numeric suffix before the extension: a.pdf, a.pdf, a.pdf becomes
 * a.pdf, a-2.pdf, a-3.pdf. Comparison ignores letter case because Windows
 * and macOS treat "A.pdf" and "a.pdf" as the same file. If a suffixed name
 * would itself collide with another name in the batch, the number keeps
 * counting up until the name is free.
 */
export function dedupeFilenames(fileNames: string[]): string[] {
  const usedNamesLowercase = new Set<string>();

  return fileNames.map((fileName) => {
    if (!usedNamesLowercase.has(fileName.toLowerCase())) {
      usedNamesLowercase.add(fileName.toLowerCase());
      return fileName;
    }

    const { baseName, extension } = splitExtension(fileName);
    let suffixNumber = 2;
    let candidateName = `${baseName}-${suffixNumber}${extension}`;

    while (usedNamesLowercase.has(candidateName.toLowerCase())) {
      suffixNumber += 1;
      candidateName = `${baseName}-${suffixNumber}${extension}`;
    }

    usedNamesLowercase.add(candidateName.toLowerCase());
    return candidateName;
  });
}
