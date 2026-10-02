/**
 * FILE: lib/fileTools/downloadBlob.ts
 * ROLE: Shared — browser-only helper used by the File Tools hooks.
 *
 * PURPOSE:
 * Starts a browser download for one in-memory file (a Blob or File). Shared by
 * the Convert hook (useFileConversion) and the Rename hook (useInvoiceRename)
 * so the two never drift apart.
 */

/**
 * saveBlobToDevice
 * Starts a browser download by clicking a temporary link, then frees the
 * temporary address so memory is not held after the download starts.
 */
export function saveBlobToDevice(blob: Blob, fileName: string) {
  const temporaryUrl = URL.createObjectURL(blob);
  const temporaryLink = document.createElement("a");
  temporaryLink.href = temporaryUrl;
  temporaryLink.download = fileName;
  document.body.appendChild(temporaryLink);
  temporaryLink.click();
  temporaryLink.remove();
  // Revoke on the next tick: some browsers need the click to finish first.
  setTimeout(() => URL.revokeObjectURL(temporaryUrl), 0);
}
