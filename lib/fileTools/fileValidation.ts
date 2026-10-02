/**
 * FILE: lib/fileTools/fileValidation.ts
 * ROLE: Public File Tools — checks files the moment a visitor adds them.
 *
 * PURPOSE:
 * Runs the Section 2.4 rules before a file ever reaches the queue: not empty,
 * under 25MB, a supported type whose contents agree with its extension, and no
 * more than 50 files in the queue. The conversion engine repeats the
 * per-file checks when it converts (it never trusts the screen), but checking
 * here lets the visitor see the problem next to the file straight away.
 * Browser-only: it reads the first bytes of each file with File.slice().
 *
 * DATA FLOW:
 * 1. FileDropZone passes the newly chosen files plus how many are already queued.
 * 2. validateFiles() checks each file in order and sorts it into accepted or rejected.
 * 3. Every rejection carries its own plain-English sentence from lib/errorMessages.ts.
 * 4. The drop zone hands the accepted files to its parent and shows the rejections.
 */
import { fileToolMessages } from "@/lib/errorMessages";
import { detectImageFormatFromBytes, maxBatchFileCount, maxFileSizeBytes } from "./conversionEngine";

/** What a file really is, found from its first bytes. */
export type DetectedFileKind = "jpg" | "png" | "webp" | "heic" | "pdf";

/** Short label shown next to each queued file. */
export const detectedKindLabels: Record<DetectedFileKind, string> = {
  jpg: "JPG",
  png: "PNG",
  webp: "WEBP",
  heic: "HEIC",
  pdf: "PDF",
};

/** Why a file was left out. Lets the screen pick a hint without reading the sentence. */
export type FileRejectionCode =
  | "emptyFile"
  | "fileTooLarge"
  | "unsupportedType"
  | "typeMismatch"
  | "batchTooLarge"
  | "singleFileOnly"
  | "checkFailed";

/** A file that passed every check, with its detected type. */
export interface AcceptedFile {
  file: File;
  kind: DetectedFileKind;
}

/** A file that was left out, with the sentence to show the visitor. */
export interface RejectedFile {
  fileName: string;
  code: FileRejectionCode;
  reason: string;
}

export interface FileValidationOutcome {
  acceptedFiles: AcceptedFile[];
  rejectedFiles: RejectedFile[];
}

// File extension (lowercase, no dot) -> the type it claims to be. Same list as
// the conversion engine uses; kept here because the engine does not export it.
const claimedKindByExtension: Record<string, DetectedFileKind> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  heic: "heic",
  heif: "heic",
  pdf: "pdf",
};

/** The `accept` value for the file picker, built from the same list of extensions. */
export const acceptedFileExtensions = Object.keys(claimedKindByExtension)
  .map((extension) => `.${extension}`)
  .join(",");

/**
 * getFileExtension
 * Lowercase extension without the dot ("Photo.JPG" -> "jpg"), or "" when none.
 */
function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex < 0 || lastDotIndex === fileName.length - 1) return "";
  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * isPdfBytes
 * True when the first bytes spell "%PDF-", the signature every PDF starts with.
 */
function isPdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

/**
 * detectFileKind
 * Reads the first 16 bytes and returns what the file really is, or null when
 * it is none of the supported types. The browser's own MIME type is not used:
 * it is empty for HEIC on most systems and can be wrong for renamed files.
 */
async function detectFileKind(file: File): Promise<DetectedFileKind | null> {
  const firstBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (isPdfBytes(firstBytes)) return "pdf";
  return detectImageFormatFromBytes(firstBytes);
}

/** Builds a rejection in one place so every one has the same shape. */
function reject(file: File, code: FileRejectionCode): RejectedFile {
  return { fileName: file.name, code, reason: fileToolMessages[code](file.name) };
}

/**
 * formatFileSize
 * Turns a byte count into a short readable size ("2.4 MB"). Uses 1024-based
 * units to match how operating systems show file sizes.
 */
export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * validateFiles
 * Checks newly added files one by one, in the order given.
 *
 * Order of checks per file: empty, too large, readable + supported type,
 * extension agrees with contents, then room left in the queue. A file that
 * fails an earlier check never uses up a queue slot. In single-file mode only
 * the first file is considered; the others are rejected with their own message.
 *
 * @param newFiles           - Files the visitor just dropped or selected
 * @param alreadyQueuedCount - How many valid files are already in the queue
 * @param allowMultiple      - false for individual mode (one file at a time)
 */
export async function validateFiles(
  newFiles: File[],
  alreadyQueuedCount: number,
  allowMultiple: boolean
): Promise<FileValidationOutcome> {
  const acceptedFiles: AcceptedFile[] = [];
  const rejectedFiles: RejectedFile[] = [];
  let slotsLeft = maxBatchFileCount - alreadyQueuedCount;

  for (const [fileIndex, file] of newFiles.entries()) {
    // Individual mode: keep the first file, refuse the rest with a clear reason.
    if (!allowMultiple && fileIndex > 0) {
      rejectedFiles.push(reject(file, "singleFileOnly"));
      continue;
    }

    if (file.size === 0) {
      rejectedFiles.push(reject(file, "emptyFile"));
      continue;
    }

    if (file.size > maxFileSizeBytes) {
      rejectedFiles.push(reject(file, "fileTooLarge"));
      continue;
    }

    let detectedKind: DetectedFileKind | null;
    try {
      detectedKind = await detectFileKind(file);
    } catch {
      // The file could not be read (moved, locked, or removed while choosing it).
      rejectedFiles.push(reject(file, "checkFailed"));
      continue;
    }

    if (!detectedKind) {
      rejectedFiles.push(reject(file, "unsupportedType"));
      continue;
    }

    // The extension must agree with what the file really is (Section 2.4).
    if (claimedKindByExtension[getFileExtension(file.name)] !== detectedKind) {
      rejectedFiles.push(reject(file, "typeMismatch"));
      continue;
    }

    // Only a file that is otherwise fine can be turned away for lack of room.
    if (slotsLeft <= 0) {
      rejectedFiles.push(reject(file, "batchTooLarge"));
      continue;
    }

    slotsLeft -= 1;
    acceptedFiles.push({ file, kind: detectedKind });
  }

  return { acceptedFiles, rejectedFiles };
}
