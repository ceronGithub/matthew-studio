/**
 * FILE: lib/errorMessages.ts
 * ROLE: Shared — every user-facing error sentence lives here, grouped by feature.
 *
 * PURPOSE:
 * Rule 34.1 asks for one centralized place for error messages instead of
 * strings scattered inside components. Each message says WHAT went wrong and
 * WHAT the visitor can do next, in plain English — never a technical term.
 * Messages that name a file are functions, so the visitor can tell which file
 * in a batch was refused.
 *
 * Started with the File Tools group (task-49e). Add new feature groups below
 * as new objects; do not mix them into fileToolMessages.
 */

/** Largest file the File Tools accept, in words, for the messages below. */
const fileSizeLimitText = "25MB";

/** Most files the File Tools accept at once, in words, for the messages below. */
const batchSizeLimitText = "50";

export const fileToolMessages = {
  /** The file has no content at all. */
  emptyFile: (fileName: string) =>
    `${fileName} is empty, so there is nothing to convert. Choose a file that has content.`,

  /** The file is over the per-file size limit. */
  fileTooLarge: (fileName: string) =>
    `${fileName} is larger than ${fileSizeLimitText}. Please choose a smaller file.`,

  /** The file is not a JPG, PNG, WEBP, HEIC or PDF. */
  unsupportedType: (fileName: string) =>
    `${fileName} isn't a supported file type. Use a JPG, PNG, WEBP, HEIC or PDF file.`,

  /** The extension says one thing, the contents say another (Section 2.4). */
  typeMismatch: (fileName: string) =>
    `${fileName} has an extension that doesn't match its contents. Rename it correctly or export it again.`,

  /** The queue is already full, so this file was left out. */
  batchTooLarge: (fileName: string) =>
    `${fileName} wasn't added because you can convert up to ${batchSizeLimitText} files at a time. Convert or remove some files first.`,

  /** Individual mode takes one file only. */
  singleFileOnly: (fileName: string) =>
    `${fileName} wasn't added because this mode converts one file at a time. Switch to bulk mode to add several files.`,

  /** Shown when the files could not even be read to be checked. */
  checkFailed: (fileName: string) =>
    `We couldn't read ${fileName}. Make sure the file isn't open in another program, then try again.`,

  /** Empty state under the drop zone. */
  emptyQueue: "No files yet. Drop files above or choose them from your device.",

  /** Heading above the list of refused files in the drop zone. */
  rejectedHeading: "Some files weren't added",

  /** The conversion step threw something the engine did not expect (it normally returns a reason instead). */
  conversionUnexpected: (fileName: string) =>
    `We couldn't convert ${fileName}. Please try again, or choose a different format.`,

  /** Building the ZIP of converted files failed. */
  zipFailed: "We couldn't build the ZIP file. Download the files one by one instead, or try again.",

  /** Nothing is ready to convert yet. */
  nothingToConvert: "Add at least one file before converting.",

  /** Rename & Download pressed but no row has a value the pattern can use. */
  nothingToRename:
    "There is nothing to rename yet. Fill in at least one detail for a file, or change the pattern.",

  /** The Rename mode only reads PDFs; an image was dropped in. */
  renameOnlyPdf: (fileName: string) =>
    `${fileName} wasn't added because renaming works on PDF invoices only. Use the Convert mode for images.`,
};
