/**
 * FILE: lib/fileTools/invoiceExtractor.ts
 * ROLE: Public File Tools — Bulk File Converter, "Rename by Invoice" mode.
 *
 * PURPOSE:
 * Reads the text layer of an invoice PDF with pdf.js and pulls out the three
 * fields the rename pattern needs: invoice number, invoice date and client
 * name. No OCR — a scanned/image-only PDF has no text layer, so it comes back
 * as "needsManualInput" and the user types the values in the preview table.
 * Everything runs in the browser; the PDF never leaves the user's device.
 *
 * DATA FLOW:
 * 1. extractInvoiceFields(file) opens the PDF through pdfJsLoader.ts.
 * 2. extractTextLinesFromDocument() rebuilds readable lines of text from
 *    pdf.js's loose text pieces (grouped by vertical position).
 * 3. parseInvoiceFields() runs the label patterns over those lines. It is a
 *    plain function of string[], so it can be tested without any PDF.
 * 4. The result is returned with a status; this file never throws for a
 *    bad PDF so one broken file cannot stop a whole batch.
 *
 * KNOWN LIMITS (v1 — generic "Invoice No. / Date / Bill To" layouts only):
 * - Only numeric dates (2026-08-15, 08/15/2026); "August 15, 2026" is not read.
 * - A label and its value on different lines is read only for "Bill To".
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfJs } from "@/lib/fileTools/pdfJsLoader";

export type InvoiceExtractionStatus = "detected" | "partial" | "needsManualInput";

/**
 * InvoiceExtractionResult
 * A field that was not found is an empty string (not null) so it can go
 * straight into an editable input in the preview table.
 *
 * status:
 *   "detected"         — all three fields found
 *   "partial"          — one or two found
 *   "needsManualInput" — none found, no text layer, or the PDF could not be read
 * dateIsAmbiguous: true when the date was written like 03/04/2026, where day
 *   and month could be swapped. It is read month-first; the preview table
 *   should highlight it so the user can double-check.
 */
export interface InvoiceExtractionResult {
  invoiceNumber: string;
  date: string;
  client: string;
  dateIsAmbiguous: boolean;
  status: InvoiceExtractionStatus;
}

// Invoices are short; scanning past the first few pages only costs time.
const maxPagesToScan = 5;

// Two text pieces whose baselines differ by less than this many PDF units
// are treated as being on the same line.
const sameLineTolerance = 3;

// Horizontal gap between two text pieces, as a multiple of the text height:
// below the first value they are glued together (same word), below the
// second they are separated by one space, above it by two spaces — which
// marks a column break (e.g. "Bill To" and "Ship To" side by side).
const sameWordGapRatio = 0.15;
const columnGapRatio = 1.5;

// Cap on a client name so a mis-read paragraph can't become a filename.
const maxClientNameLength = 80;

/** The parts of a pdf.js text item this file uses (kept local so it doesn't depend on pdf.js's internal type paths). */
interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * isPdfTextItem
 * pdf.js returns text pieces mixed with "marked content" markers that have
 * no text. This keeps only the real text pieces.
 */
function isPdfTextItem(item: unknown): item is PdfTextItem {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

/**
 * buildLinesFromTextItems
 * pdf.js hands back text as separate pieces with x/y positions, not lines.
 * This groups pieces that sit at the same height into one line, orders each
 * line left to right, and joins the pieces with a space — or two spaces
 * when there is a wide gap, so column layouts can be split apart later.
 * Lines are returned top to bottom.
 */
export function buildLinesFromTextItems(textItems: PdfTextItem[]): string[] {
  const visibleItems = textItems.filter((item) => item.str.trim() !== "");

  // PDF y-coordinates grow upward, so a bigger y means higher on the page.
  const topToBottom = [...visibleItems].sort((first, second) => second.transform[5] - first.transform[5]);

  const groupedLines: PdfTextItem[][] = [];
  let currentLineHeight: number | null = null;

  for (const item of topToBottom) {
    const itemHeight = item.transform[5];
    const startsNewLine =
      currentLineHeight === null || Math.abs(itemHeight - currentLineHeight) > sameLineTolerance;

    if (startsNewLine) {
      groupedLines.push([item]);
      currentLineHeight = itemHeight;
    } else {
      groupedLines[groupedLines.length - 1].push(item);
    }
  }

  return groupedLines.map((lineItems) => {
    const leftToRight = [...lineItems].sort((first, second) => first.transform[4] - second.transform[4]);

    let lineText = "";
    let previousRightEdge: number | null = null;

    for (const item of leftToRight) {
      const textHeight = item.height || Math.abs(item.transform[3]) || 10;
      const piece = item.str.trim();

      if (previousRightEdge !== null) {
        const gap = item.transform[4] - previousRightEdge;
        if (gap > textHeight * columnGapRatio) lineText += "  ";
        else if (gap > textHeight * sameWordGapRatio) lineText += " ";
      }

      lineText += piece;
      previousRightEdge = item.transform[4] + item.width;
    }

    return lineText.trim();
  });
}

/**
 * extractTextLinesFromDocument
 * Reads the first few pages of an already-opened pdf.js document and returns
 * all their text as lines (page by page, top to bottom). Exported so the PDF
 * to TXT conversion (task-49d) can reuse it. Takes the opened document as an
 * argument so it can also be exercised without loading the pdf.js worker.
 */
export async function extractTextLinesFromDocument(
  pdfDocument: PDFDocumentProxy,
  maxPages: number = maxPagesToScan
): Promise<string[]> {
  const allLines: string[] = [];
  const pagesToRead = Math.min(pdfDocument.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    allLines.push(...buildLinesFromTextItems((textContent.items as unknown[]).filter(isPdfTextItem)));
    page.cleanup();
  }

  return allLines;
}

/**
 * extractPdfTextLines
 * Opens a File with pdf.js, returns its text as lines, and always releases
 * the document afterwards. Throws if the PDF cannot be opened (corrupt,
 * password-protected) — extractInvoiceFields() catches that.
 */
export async function extractPdfTextLines(file: File, maxPages: number = maxPagesToScan): Promise<string[]> {
  const pdfJs = await loadPdfJs();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfJs.getDocument({ data: fileBytes });

  try {
    const pdfDocument = await loadingTask.promise;
    return await extractTextLinesFromDocument(pdfDocument, maxPages);
  } finally {
    // Frees the worker connection and the document's memory.
    await loadingTask.destroy();
  }
}

// ---------------------------------------------------------------------------
// FIELD PARSING — plain functions over lines of text
// ---------------------------------------------------------------------------

// "Invoice No.: X", "Invoice #X", "Invoice Number X". The label word must end
// at a boundary so "Invoice Notes" is not read as "Invoice No" + "tes".
const invoiceNumberLabelPattern =
  /\binvoice\s*(?:(?:no|number|num)\b\.?|#)\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\-_/]*)/i;

// Looser fallback: "Invoice: INV-2026-0142" or "Tax Invoice 0142". The value
// must contain a digit so "Invoice Date" is never read as a number.
const invoiceNumberLooseLabelPattern = /\binvoice\s*[:\-]?\s*([A-Z0-9\-_/]*\d[A-Z0-9\-_/]*)/i;

/**
 * cleanInvoiceNumber
 * Trims trailing separators and rejects values with no digit at all
 * (a real invoice number always has one; "Date" or "Notes" do not).
 */
function cleanInvoiceNumber(rawValue: string): string {
  const trimmedValue = rawValue.replace(/[-_/]+$/, "");
  return /\d/.test(trimmedValue) ? trimmedValue : "";
}

/**
 * parseInvoiceNumber
 * Looks for the invoice number: first the strict "Invoice No./#/Number"
 * label across all lines, then the looser "Invoice <value>" form.
 */
export function parseInvoiceNumber(lines: string[]): string {
  for (const pattern of [invoiceNumberLabelPattern, invoiceNumberLooseLabelPattern]) {
    for (const line of lines) {
      const labelMatch = pattern.exec(line);
      const cleanedNumber = labelMatch ? cleanInvoiceNumber(labelMatch[1]) : "";
      if (cleanedNumber) return cleanedNumber;
    }
  }
  return "";
}

// A date label followed by a numeric date, capturing optional words before
// "date": "Due Date" must be ignored, "Invoice Date"/"Issue Date" preferred.
const dateLabelPattern =
  /\b(due\s+)?(invoice\s+|issue\s+|issued\s+)?date(?:\s+of\s+issue)?\b\s*[:\-]?\s*(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})/gi;

/**
 * isRealCalendarDate
 * True when year/month/day describe a real calendar date (rejects 2026-02-30).
 */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  const checkDate = new Date(Date.UTC(year, month - 1, day));
  return (
    checkDate.getUTCFullYear() === year &&
    checkDate.getUTCMonth() === month - 1 &&
    checkDate.getUTCDate() === day
  );
}

/**
 * normalizeInvoiceDate
 * Converts a numeric date written with / or - into YYYY-MM-DD.
 *   2026-08-15 or 2026/8/15  -> year first, unambiguous
 *   08/15/2026 or 15/08/2026 -> year last; whichever number is above 12 must
 *                               be the day; if both are 12 or below it is read
 *                               month-first and flagged ambiguous
 *   08/15/26                 -> two-digit year read as 20xx
 * Returns null when the text is not a real date.
 */
export function normalizeInvoiceDate(rawDate: string): { date: string; isAmbiguous: boolean } | null {
  const parts = rawDate.split(/[/-]/);
  if (parts.length !== 3) return null;

  const [firstPart, secondPart, thirdPart] = parts;
  let year: number;
  let month: number;
  let day: number;
  let isAmbiguous = false;

  if (firstPart.length === 4) {
    year = Number(firstPart);
    month = Number(secondPart);
    day = Number(thirdPart);
  } else if (thirdPart.length === 4 || (thirdPart.length === 2 && firstPart.length <= 2)) {
    const firstNumber = Number(firstPart);
    const secondNumber = Number(secondPart);
    year = thirdPart.length === 2 ? 2000 + Number(thirdPart) : Number(thirdPart);

    if (firstNumber > 12) {
      day = firstNumber;
      month = secondNumber;
    } else {
      month = firstNumber;
      day = secondNumber;
      // Both could be a month, and they differ, so the order is a guess.
      isAmbiguous = secondNumber <= 12 && firstNumber !== secondNumber;
    }
  } else {
    return null;
  }

  if (!isRealCalendarDate(year, month, day)) return null;

  const pad = (value: number) => String(value).padStart(2, "0");
  return { date: `${year}-${pad(month)}-${pad(day)}`, isAmbiguous };
}

/**
 * parseInvoiceDate
 * Finds the invoice date. A date labelled "Invoice Date" / "Issue Date" wins
 * over a bare "Date"; anything labelled "Due Date" is ignored. Candidates that
 * are not real dates are skipped in favour of the next one.
 */
export function parseInvoiceDate(lines: string[]): { date: string; isAmbiguous: boolean } | null {
  const preferredDates: string[] = [];
  const plainDates: string[] = [];

  for (const line of lines) {
    for (const match of line.matchAll(dateLabelPattern)) {
      const isDueDate = Boolean(match[1]);
      const hasInvoiceOrIssuePrefix = Boolean(match[2]);
      if (isDueDate) continue;
      (hasInvoiceOrIssuePrefix ? preferredDates : plainDates).push(match[3]);
    }
  }

  for (const rawDate of [...preferredDates, ...plainDates]) {
    const normalizedDate = normalizeInvoiceDate(rawDate);
    if (normalizedDate) return normalizedDate;
  }
  return null;
}

// "Bill To", "Billed To" or "Client"/"Client Name". A bare "Client" must be
// followed by ":" or "-" or end of line so "Client Reference: X" is not read
// as a name. Whatever follows on the same line is captured.
const clientLabelPattern =
  /^\s*(?:bill(?:ed)?\s*to\b\s*[:\-]?|client(?:\s*name)?\s*(?::|-|$))\s*(.*)$/i;

// Words that start the next column/field on the same line — a client name
// ends where one of these begins.
const nextFieldLabelPattern = /\b(?:ship(?:ped)?\s*to|from|invoice|date|due)\b/i;

/**
 * cleanClientName
 * Keeps only the first column of the text (split on a wide gap), cuts it at
 * the next field label, and tidies leftover punctuation. Returns "" when
 * nothing usable is left.
 */
function cleanClientName(rawText: string): string {
  const firstColumn = rawText.split(/\s{2,}/)[0];
  const cutIndex = firstColumn.search(nextFieldLabelPattern);
  const beforeNextLabel = cutIndex >= 0 ? firstColumn.slice(0, cutIndex) : firstColumn;

  return beforeNextLabel
    .replace(/^[\s:\-,]+|[\s:\-,]+$/g, "")
    .slice(0, maxClientNameLength);
}

/**
 * parseClientName
 * Finds the client: the text after "Bill To:" / "Client:" on the same line,
 * or — when the label stands alone — the first line below it (first line
 * only, per the spec).
 */
export function parseClientName(lines: string[]): string {
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const labelMatch = clientLabelPattern.exec(lines[lineIndex]);
    if (!labelMatch) continue;

    const sameLineName = cleanClientName(labelMatch[1]);
    if (sameLineName) return sameLineName;

    const nextLineName = cleanClientName(lines[lineIndex + 1] ?? "");
    if (nextLineName) return nextLineName;
  }
  return "";
}

/**
 * parseInvoiceFields
 * Runs the three parsers over the lines and decides the status. Pure
 * function — no PDF, no browser needed.
 */
export function parseInvoiceFields(lines: string[]): InvoiceExtractionResult {
  const invoiceNumber = parseInvoiceNumber(lines);
  const parsedDate = parseInvoiceDate(lines);
  const client = parseClientName(lines);

  const foundFieldCount = [invoiceNumber, parsedDate?.date ?? "", client].filter(Boolean).length;
  const status: InvoiceExtractionStatus =
    foundFieldCount === 3 ? "detected" : foundFieldCount === 0 ? "needsManualInput" : "partial";

  return {
    invoiceNumber,
    date: parsedDate?.date ?? "",
    client,
    dateIsAmbiguous: parsedDate?.isAmbiguous ?? false,
    status,
  };
}

/**
 * extractInvoiceFields
 * Public entry point: File in, InvoiceExtractionResult out. Never throws —
 * a PDF that is corrupt, password-protected, or has no text layer (a scan)
 * returns status "needsManualInput" with empty fields, so one bad file is
 * flagged in the preview table instead of stopping the whole batch.
 */
export async function extractInvoiceFields(file: File): Promise<InvoiceExtractionResult> {
  try {
    const textLines = await extractPdfTextLines(file);
    return parseInvoiceFields(textLines);
  } catch {
    // Unreadable PDF — treated the same as "nothing detected".
    return parseInvoiceFields([]);
  }
}
