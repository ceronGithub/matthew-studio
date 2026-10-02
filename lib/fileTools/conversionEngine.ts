/**
 * FILE: lib/fileTools/conversionEngine.ts
 * ROLE: Public File Tools — Bulk File Converter, "Convert" mode (images + PDFs).
 *
 * PURPOSE:
 * Converts one image file (JPG, PNG, WEBP or HEIC) into JPG, PNG, WEBP or a
 * single-page PDF, and one PDF into JPG/PNG pages or a TXT file. It also
 * merges several PDFs into one and splits one PDF into single-page PDFs —
 * entirely in the browser; the file never leaves the visitor's device
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 2.1).
 * Browser-only: it uses canvas, createImageBitmap and pdf.js, so call it
 * from client code (never while rendering a Server Component).
 *
 * The result is a list of files, not a single file, so one PDF turned into
 * one image per page returns the same shape as a single converted image.
 * Every failure comes back as a typed result with a plain-English reason
 * (Rule 34.1) — this module never throws and never exposes a raw error.
 *
 * DATA FLOW (convertFile):
 * 1. convertFile() checks the request (target format, empty file, 25MB limit).
 * 2. The first bytes of the file are read to find out what it really is, and
 *    that must match the file extension (Section 2.4).
 * 3. A PDF goes to the PDF branch: pdf.js draws each page on a canvas (JPG/PNG)
 *    or reads the text layer (TXT).
 * 4. An image goes to the image branch: HEIC is decoded to PNG by heic2any
 *    first, because browsers cannot open it.
 * 5. The image is drawn onto a canvas (createImageBitmap also applies the
 *    phone-camera rotation stored in the photo).
 * 6. The canvas is saved as JPG/PNG/WEBP, or the saved image is placed on a
 *    one-page PDF by pdf-lib.
 *
 * mergePdfs() and splitPdf() are separate entry points: merge takes the whole
 * batch of queued PDFs at once, so it does not fit convertFile's one-file shape.
 *
 * The batch-size limit (50 files) belongs to the bulk screen, not to this
 * per-file function, so it is only exported here as a constant (task-49g).
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { sanitizeFilenamePart } from "./filenameBuilder";
import { extractTextLinesFromDocument } from "./invoiceExtractor";
import { loadPdfJs } from "./pdfJsLoader";

/** Largest file the tool accepts, per Section 2.4 (client-side memory limit). */
export const maxFileSizeBytes = 25 * 1024 * 1024;

/** Most files one bulk run accepts, per Section 2.4. Enforced by the bulk screen. */
export const maxBatchFileCount = 50;

/** Image formats this engine can read. */
export type ImageInputFormat = "jpg" | "png" | "webp" | "heic";

/** Formats this engine can write (Section 2.1, Images row). */
export const imageTargetFormats = ["jpg", "png", "webp", "pdf"] as const;
export type ImageTargetFormat = (typeof imageTargetFormats)[number];

/** Formats a PDF can be converted to by convertFile (Section 2.1, PDF utilities + Documents rows). */
export const pdfTargetFormats = ["jpg", "png", "txt"] as const;
export type PdfTargetFormat = (typeof pdfTargetFormats)[number];

/** Everything this engine can read: the four image formats plus PDF. */
type InputFormat = ImageInputFormat | "pdf";

/** One converted file, ready to download or add to a ZIP. */
export interface ConvertedFile {
  blob: Blob;
  fileName: string;
}

/** Why a conversion was refused or failed — lets the UI choose an icon or retry hint. */
export type ConversionFailureCode =
  | "emptyFile"
  | "fileTooLarge"
  | "unsupportedInput"
  | "typeMismatch"
  | "unsupportedTarget"
  | "decodeFailed"
  | "encodeFailed"
  | "passwordProtected"
  | "tooManyPages"
  | "noTextFound"
  | "notEnoughFiles";

export interface ConversionSuccess {
  ok: true;
  files: ConvertedFile[];
}

export interface ConversionFailure {
  ok: false;
  code: ConversionFailureCode;
  /** Sentence shown to the visitor next to the file. Never a raw error message. */
  reason: string;
}

export type ConversionResult = ConversionSuccess | ConversionFailure;

// Quality used when saving lossy JPG/WEBP. 0.92 is visually the same as the
// original for photos while keeping the file clearly smaller than 1.0.
const lossyImageQuality = 0.92;

// Canvases above this many pixels fail on many phones. Refusing early gives
// a clear message instead of a blank or crashed result.
const maxCanvasPixels = 100_000_000;

// Most pages a PDF may have when the result is one file per page (images,
// split). Every page becomes its own file held in memory until the visitor
// downloads, so an unbounded page count could exhaust a phone's memory.
// ASSUMPTION: 100 is a starting value — the spec gives no page limit.
const maxPdfPages = 100;

// PDF pages are drawn at 2x their natural size (about 144 dpi): sharp enough
// to read small print without producing huge image files.
const pdfPageImageScale = 2;

// PDF pages are sized to fit inside an A4 sheet (in points, 1 point = 1/72 inch).
const a4ShortSidePoints = 595;
const a4LongSidePoints = 842;

// Extension (lowercase, no dot) -> the format it claims to be.
const formatByExtension: Record<string, InputFormat> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  heic: "heic",
  heif: "heic",
  pdf: "pdf",
};

// Output format -> the file extension and MIME type used when saving it.
const outputDetails: Record<ImageTargetFormat, { extension: string; mimeType: string }> = {
  jpg: { extension: "jpg", mimeType: "image/jpeg" },
  png: { extension: "png", mimeType: "image/png" },
  webp: { extension: "webp", mimeType: "image/webp" },
  pdf: { extension: "pdf", mimeType: "application/pdf" },
};

// Output file extension for TXT results (images and PDFs use outputDetails).
const textFileExtension = "txt";

/** Builds the failure result in one place so every refusal has the same shape. */
function failure(code: ConversionFailureCode, reason: string): ConversionFailure {
  return { ok: false, code, reason };
}

/** Puts the file's name in front of a failure's reason, so a batch result says which file broke. */
function withFileName(failedResult: ConversionFailure, fileName: string): ConversionFailure {
  return { ...failedResult, reason: `${fileName}: ${failedResult.reason}` };
}

/**
 * isPdfTargetFormat
 * True when the value is one of the three outputs a PDF can be converted to.
 */
export function isPdfTargetFormat(value: string): value is PdfTargetFormat {
  return (pdfTargetFormats as readonly string[]).includes(value);
}

/**
 * isImageTargetFormat
 * True when the value is one of the four output formats this engine writes.
 * Callers pass a plain string from a dropdown, so this is checked at run time.
 */
export function isImageTargetFormat(value: string): value is ImageTargetFormat {
  return (imageTargetFormats as readonly string[]).includes(value);
}

/**
 * getFileExtension
 * Returns the lowercase extension without the dot ("Photo.JPG" -> "jpg"),
 * or an empty string when the name has none.
 */
function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex < 0 || lastDotIndex === fileName.length - 1) return "";
  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * getBaseName
 * The file name without its extension, cleaned for use as an output name.
 * Falls back to "image" when nothing usable is left.
 */
function getBaseName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  const withoutExtension = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  return sanitizeFilenamePart(withoutExtension) || "image";
}

/**
 * detectImageFormatFromBytes
 * Looks at the first bytes of a file to find out what it really is, no matter
 * what the name or the browser's MIME type says. Returns null when the bytes
 * match none of the four supported formats.
 *   JPG  starts FF D8 FF
 *   PNG  starts 89 50 4E 47
 *   WEBP starts "RIFF", then 4 size bytes, then "WEBP"
 *   HEIC has "ftyp" at byte 4 followed by a HEIF brand such as heic or mif1
 */
export function detectImageFormatFromBytes(bytes: Uint8Array): ImageInputFormat | null {
  const readText = (start: number, length: number) =>
    String.fromCharCode(...Array.from(bytes.slice(start, start + length)));

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";

  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }

  if (bytes.length >= 12 && readText(0, 4) === "RIFF" && readText(8, 4) === "WEBP") return "webp";

  if (bytes.length >= 12 && readText(4, 4) === "ftyp") {
    const heifBrands = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"];
    if (heifBrands.includes(readText(8, 4))) return "heic";
  }

  return null;
}

/**
 * isPdfBytes
 * True when the first bytes spell "%PDF-", the signature every PDF starts with.
 */
function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

/**
 * inspectInputFile
 * Runs the Section 2.4 checks that need the file's contents: it must not be
 * empty, must be under the size limit, must be a supported image or PDF, and
 * its real type must agree with its extension. Returns the detected format,
 * or the failure to hand straight back to the caller.
 */
async function inspectInputFile(file: File): Promise<InputFormat | ConversionFailure> {
  if (file.size === 0) {
    return failure("emptyFile", "This file is empty, so there is nothing to convert.");
  }

  if (file.size > maxFileSizeBytes) {
    return failure("fileTooLarge", "This file is larger than 25MB. Please choose a smaller one.");
  }

  const firstBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedFormat: InputFormat | null = isPdfBytes(firstBytes) ? "pdf" : detectImageFormatFromBytes(firstBytes);
  if (!detectedFormat) {
    return failure("unsupportedInput", "This file type isn't supported. Use a JPG, PNG, WEBP, HEIC or PDF file.");
  }

  // The extension must agree with what the file really is (Section 2.4).
  const claimedFormat = formatByExtension[getFileExtension(file.name)];
  if (claimedFormat !== detectedFormat) {
    return failure(
      "typeMismatch",
      "The file's extension doesn't match its contents. Rename it correctly or export it again."
    );
  }

  return detectedFormat;
}

/**
 * decodeHeicToPng
 * Browsers cannot open HEIC, so heic2any turns it into a PNG first. The
 * library is large and browser-only, so it is imported only when a HEIC
 * file is actually converted. If a HEIC holds several images, only the first
 * one is used.
 */
async function decodeHeicToPng(file: File): Promise<Blob | ConversionFailure> {
  try {
    const { default: heic2any } = await import("heic2any");
    const decoded = await heic2any({ blob: file, toType: "image/png" });
    const firstImage = Array.isArray(decoded) ? decoded[0] : decoded;
    if (!firstImage) throw new Error("HEIC decoder returned no image");
    return firstImage;
  } catch {
    return failure("decodeFailed", "We couldn't read this HEIC photo. It may be damaged or use an unsupported variant.");
  }
}

/**
 * saveCanvas
 * Saves a canvas as an image Blob of the requested type. Returns null when
 * the browser cannot do it: toBlob gives null on failure, and quietly hands
 * back a PNG when it cannot write the requested type (older Safari with
 * WEBP), which would be a wrong file wearing the right name.
 */
function saveCanvas(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (savedBlob) => resolve(savedBlob && savedBlob.type === mimeType ? savedBlob : null),
      mimeType,
      lossyImageQuality
    );
  });
}

/**
 * drawToCanvas
 * Opens the image data in the browser and paints it on a canvas. A solid
 * white background is painted first so transparent areas (PNG, WEBP) become
 * white in a JPG or PDF instead of black.
 */
async function drawToCanvas(imageBlob: Blob): Promise<HTMLCanvasElement | ConversionFailure> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(imageBlob);
  } catch {
    return failure("decodeFailed", "We couldn't open this image. It may be damaged.");
  }

  try {
    if (bitmap.width * bitmap.height > maxCanvasPixels) {
      return failure("decodeFailed", "This image has too many pixels to convert in the browser. Try a smaller version.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const drawingContext = canvas.getContext("2d");
    if (!drawingContext) {
      return failure("encodeFailed", "Your browser couldn't prepare the image for conversion.");
    }

    drawingContext.fillStyle = "#ffffff";
    drawingContext.fillRect(0, 0, canvas.width, canvas.height);
    drawingContext.drawImage(bitmap, 0, 0);
    return canvas;
  } finally {
    // Frees the decoded pixels right away instead of waiting for garbage collection.
    bitmap.close();
  }
}

/**
 * canvasToPdfBlob
 * Places the canvas picture on a one-page PDF. PNG sources stay PNG so
 * transparency and sharp edges survive; everything else is saved as JPEG,
 * which keeps photo PDFs small. The page is shaped like the picture and
 * scaled to fit inside A4, and the picture fills the whole page.
 * pdf-lib is imported only when a PDF is requested.
 */
async function canvasToPdfBlob(canvas: HTMLCanvasElement, sourceFormat: ImageInputFormat): Promise<Blob | ConversionFailure> {
  const embeddedMimeType = sourceFormat === "png" ? "image/png" : "image/jpeg";
  const embeddedImageBlob = await saveCanvas(canvas, embeddedMimeType);
  if (!embeddedImageBlob) {
    return failure("encodeFailed", "Your browser couldn't prepare the image for the PDF.");
  }

  try {
    const { PDFDocument } = await import("pdf-lib");
    const pdfDocument = await PDFDocument.create();
    const imageBytes = new Uint8Array(await embeddedImageBlob.arrayBuffer());
    const embeddedImage =
      embeddedMimeType === "image/png" ? await pdfDocument.embedPng(imageBytes) : await pdfDocument.embedJpg(imageBytes);

    // Landscape pictures get a landscape sheet, portrait ones a portrait sheet.
    const isLandscape = canvas.width > canvas.height;
    const sheetWidth = isLandscape ? a4LongSidePoints : a4ShortSidePoints;
    const sheetHeight = isLandscape ? a4ShortSidePoints : a4LongSidePoints;
    const fitScale = Math.min(sheetWidth / canvas.width, sheetHeight / canvas.height);
    const pageWidth = canvas.width * fitScale;
    const pageHeight = canvas.height * fitScale;

    const page = pdfDocument.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    const pdfBytes = await pdfDocument.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  } catch {
    return failure("encodeFailed", "We couldn't build the PDF from this image.");
  }
}

/** An opened pdf.js document plus the call that must run when we are done with it. */
interface OpenedPdf {
  pdfDocument: PDFDocumentProxy;
  closePdf: () => Promise<void>;
}

/**
 * describePdfOpenFailure
 * Turns whatever pdf.js threw while opening a PDF into a plain-English
 * failure. A password-protected PDF gets its own message because the visitor
 * can fix it; everything else is treated as a damaged file.
 */
function describePdfOpenFailure(openError: unknown): ConversionFailure {
  if (openError instanceof Error && openError.name === "PasswordException") {
    return failure("passwordProtected", "This PDF is password-protected. Remove the password and try again.");
  }
  return failure("decodeFailed", "We couldn't read this PDF. It may be damaged.");
}

/**
 * openPdfWithPdfJs
 * Opens a PDF in pdf.js from a local copy of its bytes. The caller must call
 * closePdf() when finished (use try/finally) so the worker frees the memory.
 */
async function openPdfWithPdfJs(file: File): Promise<OpenedPdf | ConversionFailure> {
  try {
    const pdfJs = await loadPdfJs();
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfJs.getDocument({ data: fileBytes });

    try {
      const pdfDocument = await loadingTask.promise;
      return { pdfDocument, closePdf: () => loadingTask.destroy() };
    } catch (openError) {
      // The document never opened, so release the loading task here.
      await loadingTask.destroy();
      throw openError;
    }
  } catch (openError) {
    return describePdfOpenFailure(openError);
  }
}

/**
 * convertPdfToImages
 * Draws every page of a PDF on a canvas and saves each as a JPG or PNG, one
 * file per page, named "<name>-page-01.jpg" (numbers padded so they sort
 * correctly). All-or-nothing: if any page fails, no files are returned,
 * because a missing page in the middle is worse than a clear failure.
 * Pages are processed one at a time and each canvas is released straight
 * away, so memory holds only the finished image files.
 */
async function convertPdfToImages(file: File, imageFormat: "jpg" | "png"): Promise<ConversionResult> {
  const openedPdf = await openPdfWithPdfJs(file);
  if ("ok" in openedPdf) return openedPdf;
  const { pdfDocument, closePdf } = openedPdf;

  try {
    if (pdfDocument.numPages > maxPdfPages) {
      return failure("tooManyPages", `This PDF has more than ${maxPdfPages} pages. Split it into smaller files first.`);
    }

    const { extension, mimeType } = outputDetails[imageFormat];
    const baseName = getBaseName(file.name);
    const pageNumberWidth = String(pdfDocument.numPages).length;
    const pageImages: ConvertedFile[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);

      try {
        // Draw at 2x, but shrink very large pages (posters, maps) so the canvas stays under the pixel limit.
        const naturalViewport = page.getViewport({ scale: 1 });
        const pixelLimitScale = Math.sqrt(maxCanvasPixels / (naturalViewport.width * naturalViewport.height));
        const pageViewport = page.getViewport({ scale: Math.min(pdfPageImageScale, pixelLimitScale) });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(pageViewport.width);
        canvas.height = Math.floor(pageViewport.height);

        // White background so the transparent parts of a PDF page become white, not black, in a JPG.
        await page.render({ canvas, viewport: pageViewport, background: "#ffffff" }).promise;

        const pageBlob = await saveCanvas(canvas, mimeType);

        // Frees the page's pixels right away instead of waiting for garbage collection.
        canvas.width = 0;
        canvas.height = 0;

        if (!pageBlob) {
          return failure("encodeFailed", `We couldn't save page ${pageNumber} as an image. Please try again.`);
        }

        pageImages.push({
          blob: pageBlob,
          fileName: `${baseName}-page-${String(pageNumber).padStart(pageNumberWidth, "0")}.${extension}`,
        });
      } catch {
        return failure("decodeFailed", `We couldn't draw page ${pageNumber} of this PDF. It may be damaged.`);
      } finally {
        page.cleanup();
      }
    }

    return { ok: true, files: pageImages };
  } finally {
    await closePdf();
  }
}

/**
 * convertPdfToText
 * Reads the text layer of every page and returns it as one .txt file, using
 * the same line-rebuilding code as the invoice renamer. A scanned PDF has no
 * text layer and there is no OCR in v1, so it returns "noTextFound" instead
 * of an empty file. Known limit: pages run on without page-break markers.
 */
async function convertPdfToText(file: File): Promise<ConversionResult> {
  const openedPdf = await openPdfWithPdfJs(file);
  if ("ok" in openedPdf) return openedPdf;
  const { pdfDocument, closePdf } = openedPdf;

  try {
    const textLines = await extractTextLinesFromDocument(pdfDocument, pdfDocument.numPages);
    if (textLines.length === 0) {
      return failure(
        "noTextFound",
        "This PDF has no selectable text — it may be a scan. Text can only be taken from PDFs that were not scanned."
      );
    }

    const textBlob = new Blob([textLines.join("\n")], { type: "text/plain;charset=utf-8" });
    return { ok: true, files: [{ blob: textBlob, fileName: `${getBaseName(file.name)}.${textFileExtension}` }] };
  } catch {
    return failure("decodeFailed", "We couldn't read the text in this PDF. It may be damaged.");
  } finally {
    await closePdf();
  }
}

/**
 * readPdfBytes
 * Runs the shared file checks (empty, 25MB, real type, extension) and
 * returns the PDF's bytes for pdf-lib, or the failure to hand back.
 */
async function readPdfBytes(file: File): Promise<Uint8Array | ConversionFailure> {
  const inspectedFormat = await inspectInputFile(file);
  if (typeof inspectedFormat !== "string") return inspectedFormat;
  if (inspectedFormat !== "pdf") {
    return failure("unsupportedInput", "Only PDF files can be merged or split.");
  }
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * loadPdfLibDocument
 * Opens PDF bytes in pdf-lib for merging or splitting. An encrypted PDF is
 * reported as password-protected; anything else that fails is a damaged file.
 */
async function loadPdfLibDocument(
  pdfLib: typeof import("pdf-lib"),
  pdfBytes: Uint8Array
): Promise<import("pdf-lib").PDFDocument | ConversionFailure> {
  try {
    const loadedDocument = await pdfLib.PDFDocument.load(pdfBytes, { updateMetadata: false });
    // pdf-lib accepts a damaged file at load time and only fails when the pages are read,
    // so reading the page count here turns that late failure into a clear "damaged" result.
    loadedDocument.getPageCount();
    return loadedDocument;
  } catch (loadError) {
    if (loadError instanceof pdfLib.EncryptedPDFError) {
      return failure("passwordProtected", "This PDF is password-protected. Remove the password and try again.");
    }
    return failure("decodeFailed", "We couldn't read this PDF. It may be damaged.");
  }
}

/** Wraps saved PDF bytes in a Blob. */
function pdfBytesToBlob(pdfBytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(pdfBytes)], { type: outputDetails.pdf.mimeType });
}

/**
 * mergePdfs
 * Joins the PDFs into one file, pages in the order the files are given.
 * Separate from convertFile because it takes the whole batch at once. Needs
 * at least two files. If any file fails, nothing is returned and the reason
 * starts with that file's name. Returns a single file named "merged.pdf".
 */
export async function mergePdfs(files: File[]): Promise<ConversionResult> {
  if (files.length < 2) {
    return failure("notEnoughFiles", "Add at least two PDFs to merge them into one.");
  }

  try {
    // pdf-lib is large, so it is only loaded when someone actually merges or splits.
    const pdfLib = await import("pdf-lib");
    const mergedDocument = await pdfLib.PDFDocument.create();

    for (const file of files) {
      const pdfBytes = await readPdfBytes(file);
      if (!(pdfBytes instanceof Uint8Array)) return withFileName(pdfBytes, file.name);

      const sourceDocument = await loadPdfLibDocument(pdfLib, pdfBytes);
      if ("ok" in sourceDocument) return withFileName(sourceDocument, file.name);

      const copiedPages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());
      copiedPages.forEach((copiedPage) => mergedDocument.addPage(copiedPage));
    }

    const mergedBytes = await mergedDocument.save();
    return { ok: true, files: [{ blob: pdfBytesToBlob(mergedBytes), fileName: "merged.pdf" }] };
  } catch {
    return failure("encodeFailed", "We couldn't combine these PDFs. Please try again.");
  }
}

/**
 * splitPdf
 * Splits one PDF into single-page PDFs, named "<name>-page-01.pdf" (numbers
 * padded so they sort correctly). Refuses PDFs over the page limit because
 * every page is held in memory as its own file.
 */
export async function splitPdf(file: File): Promise<ConversionResult> {
  const pdfBytes = await readPdfBytes(file);
  if (!(pdfBytes instanceof Uint8Array)) return pdfBytes;

  try {
    const pdfLib = await import("pdf-lib");
    const sourceDocument = await loadPdfLibDocument(pdfLib, pdfBytes);
    if ("ok" in sourceDocument) return sourceDocument;

    const pageCount = sourceDocument.getPageCount();
    if (pageCount === 0) {
      return failure("decodeFailed", "This PDF has no pages to split.");
    }
    if (pageCount > maxPdfPages) {
      return failure("tooManyPages", `This PDF has more than ${maxPdfPages} pages. Split it in smaller parts first.`);
    }

    const baseName = getBaseName(file.name);
    const pageNumberWidth = String(pageCount).length;
    const singlePagePdfs: ConvertedFile[] = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const singlePageDocument = await pdfLib.PDFDocument.create();
      const [copiedPage] = await singlePageDocument.copyPages(sourceDocument, [pageIndex]);
      singlePageDocument.addPage(copiedPage);

      singlePagePdfs.push({
        blob: pdfBytesToBlob(await singlePageDocument.save()),
        fileName: `${baseName}-page-${String(pageIndex + 1).padStart(pageNumberWidth, "0")}.pdf`,
      });
    }

    return { ok: true, files: singlePagePdfs };
  } catch {
    return failure("encodeFailed", "We couldn't split this PDF. Please try again.");
  }
}

/**
 * convertFile
 * Converts one image into the chosen format and returns it as a list of
 * { blob, fileName } (one item for every image target). The output name is
 * the original name with the new extension. Never throws — check `ok`.
 *
 * A PDF input returns one file per page for JPG/PNG, or one .txt for TXT.
 *
 * @param file          - The image or PDF the visitor picked.
 * @param targetFormat  - Images: "jpg", "png", "webp" or "pdf". PDFs: "jpg", "png"
 *                        or "txt". Any other pairing is refused with code
 *                        "unsupportedTarget".
 */
export async function convertFile(file: File, targetFormat: string): Promise<ConversionResult> {
  // Normalised so a dropdown value like "JPG" is not treated as unsupported.
  const wantedFormat = targetFormat.trim().toLowerCase();
  if (!isImageTargetFormat(wantedFormat) && !isPdfTargetFormat(wantedFormat)) {
    return failure("unsupportedTarget", "This conversion isn't supported. Choose JPG, PNG, WEBP, PDF or TXT.");
  }

  const inspectedFormat = await inspectInputFile(file);
  if (typeof inspectedFormat !== "string") return inspectedFormat;

  // A PDF is read with pdf.js; only JPG, PNG and TXT make sense as outputs.
  if (inspectedFormat === "pdf") {
    if (wantedFormat === "jpg" || wantedFormat === "png") return convertPdfToImages(file, wantedFormat);
    if (wantedFormat === "txt") return convertPdfToText(file);
    return failure("unsupportedTarget", "A PDF can be converted to JPG, PNG or TXT.");
  }

  // Images cannot become text (there is no OCR in v1).
  if (!isImageTargetFormat(wantedFormat)) {
    return failure("unsupportedTarget", "An image can be converted to JPG, PNG, WEBP or PDF.");
  }

  // HEIC is decoded to a PNG first; every other format is already openable by the browser.
  let drawableBlob: Blob = file;
  if (inspectedFormat === "heic") {
    const decodedHeic = await decodeHeicToPng(file);
    if (!(decodedHeic instanceof Blob)) return decodedHeic;
    drawableBlob = decodedHeic;
  }

  const canvas = await drawToCanvas(drawableBlob);
  if (!(canvas instanceof HTMLCanvasElement)) return canvas;

  const { extension, mimeType } = outputDetails[wantedFormat];

  let outputBlob: Blob | null;
  if (wantedFormat === "pdf") {
    const pdfResult = await canvasToPdfBlob(canvas, inspectedFormat);
    if (!(pdfResult instanceof Blob)) return pdfResult;
    outputBlob = pdfResult;
  } else {
    outputBlob = await saveCanvas(canvas, mimeType);
    if (!outputBlob) {
      return failure(
        "encodeFailed",
        wantedFormat === "webp"
          ? "Your browser can't save WEBP images. Choose JPG or PNG instead."
          : "We couldn't save this image in the chosen format. Please try again."
      );
    }
  }

  return { ok: true, files: [{ blob: outputBlob, fileName: `${getBaseName(file.name)}.${extension}` }] };
}
