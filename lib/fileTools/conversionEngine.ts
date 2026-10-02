/**
 * FILE: lib/fileTools/conversionEngine.ts
 * ROLE: Public File Tools — Bulk File Converter, "Convert" mode (images).
 *
 * PURPOSE:
 * Converts one image file (JPG, PNG, WEBP or HEIC) into JPG, PNG, WEBP or a
 * single-page PDF, entirely in the browser — the file never leaves the
 * visitor's device (bulk_file_converter_and_pdf_renamer_specification.md
 * Section 2.1). Browser-only: it uses canvas and createImageBitmap, so call
 * it from client code (never while rendering a Server Component).
 *
 * The result is a list of files, not a single file, so later tasks that turn
 * one PDF into one image per page (task-49d) can return the same shape.
 * Every failure comes back as a typed result with a plain-English reason
 * (Rule 34.1) — this module never throws and never exposes a raw error.
 *
 * DATA FLOW:
 * 1. convertFile() checks the request (target format, empty file, 25MB limit).
 * 2. The first bytes of the file are read to find out what it really is, and
 *    that must match the file extension (Section 2.4).
 * 3. HEIC is decoded to PNG by heic2any first, because browsers cannot open it.
 * 4. The image is drawn onto a canvas (createImageBitmap also applies the
 *    phone-camera rotation stored in the photo).
 * 5. The canvas is saved as JPG/PNG/WEBP, or the saved image is placed on a
 *    one-page PDF by pdf-lib.
 *
 * The batch-size limit (50 files) belongs to the bulk screen, not to this
 * per-file function, so it is only exported here as a constant (task-49g).
 */
import { sanitizeFilenamePart } from "./filenameBuilder";

/** Largest file the tool accepts, per Section 2.4 (client-side memory limit). */
export const maxFileSizeBytes = 25 * 1024 * 1024;

/** Most files one bulk run accepts, per Section 2.4. Enforced by the bulk screen. */
export const maxBatchFileCount = 50;

/** Image formats this engine can read. */
export type ImageInputFormat = "jpg" | "png" | "webp" | "heic";

/** Formats this engine can write (Section 2.1, Images row). */
export const imageTargetFormats = ["jpg", "png", "webp", "pdf"] as const;
export type ImageTargetFormat = (typeof imageTargetFormats)[number];

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
  | "encodeFailed";

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

// PDF pages are sized to fit inside an A4 sheet (in points, 1 point = 1/72 inch).
const a4ShortSidePoints = 595;
const a4LongSidePoints = 842;

// Extension (lowercase, no dot) -> the format it claims to be.
const formatByExtension: Record<string, ImageInputFormat> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  heic: "heic",
  heif: "heic",
};

// Output format -> the file extension and MIME type used when saving it.
const outputDetails: Record<ImageTargetFormat, { extension: string; mimeType: string }> = {
  jpg: { extension: "jpg", mimeType: "image/jpeg" },
  png: { extension: "png", mimeType: "image/png" },
  webp: { extension: "webp", mimeType: "image/webp" },
  pdf: { extension: "pdf", mimeType: "application/pdf" },
};

/** Builds the failure result in one place so every refusal has the same shape. */
function failure(code: ConversionFailureCode, reason: string): ConversionFailure {
  return { ok: false, code, reason };
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
 * inspectInputFile
 * Runs the Section 2.4 checks that need the file's contents: it must not be
 * empty, must be under the size limit, must be a supported image, and its
 * real type must agree with its extension. Returns the detected format, or
 * the failure to hand straight back to the caller.
 */
async function inspectInputFile(file: File): Promise<ImageInputFormat | ConversionFailure> {
  if (file.size === 0) {
    return failure("emptyFile", "This file is empty, so there is nothing to convert.");
  }

  if (file.size > maxFileSizeBytes) {
    return failure("fileTooLarge", "This file is larger than 25MB. Please choose a smaller one.");
  }

  const detectedFormat = detectImageFormatFromBytes(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!detectedFormat) {
    return failure("unsupportedInput", "This file type isn't supported. Use a JPG, PNG, WEBP or HEIC image.");
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

/**
 * convertFile
 * Converts one image into the chosen format and returns it as a list of
 * { blob, fileName } (one item for every image target). The output name is
 * the original name with the new extension. Never throws — check `ok`.
 *
 * @param file          - The image the visitor picked.
 * @param targetFormat  - "jpg", "png", "webp" or "pdf". Anything else is refused
 *                        with code "unsupportedTarget" (documents arrive in task-49d).
 */
export async function convertFile(file: File, targetFormat: string): Promise<ConversionResult> {
  // Normalised so a dropdown value like "JPG" is not treated as unsupported.
  const wantedFormat = targetFormat.trim().toLowerCase();
  if (!isImageTargetFormat(wantedFormat)) {
    return failure("unsupportedTarget", "This conversion isn't supported. Choose JPG, PNG, WEBP or PDF for images.");
  }

  const inspectedFormat = await inspectInputFile(file);
  if (typeof inspectedFormat !== "string") return inspectedFormat;

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
