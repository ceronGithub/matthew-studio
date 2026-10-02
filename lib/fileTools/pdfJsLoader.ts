/**
 * FILE: lib/fileTools/pdfJsLoader.ts
 * ROLE: Public File Tools — shared by every feature that reads PDFs in the
 * browser (invoice extraction in task-49b, PDF conversions in task-49d).
 *
 * PURPOSE:
 * Loads pdf.js on demand and points it at its web worker. Two reasons this
 * lives in one place instead of at the top of each file:
 *   1. pdf.js touches browser-only APIs when imported, so it must never be
 *      imported at module level — Next.js would try to run it on the server
 *      while rendering the page and crash. A dynamic import inside a function
 *      only runs when a user actually converts or renames a file.
 *   2. The worker path must be set exactly once before the first PDF is
 *      opened. The `new URL(..., import.meta.url)` form tells the bundler to
 *      copy the worker file into the build, so the PDF is parsed by a script
 *      served from this site — the file itself never leaves the browser.
 *
 * DATA FLOW:
 * Caller awaits loadPdfJs() -> gets the pdf.js module (cached after the
 * first call) -> calls getDocument() on a local ArrayBuffer.
 */

type PdfJsModule = typeof import("pdfjs-dist");

// Holds the in-flight or finished load so repeated calls share one import.
let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

/**
 * loadPdfJs
 * Returns the pdf.js module with its worker configured. Safe to call many
 * times — the import and worker setup run once. If the import fails (for
 * example a dropped connection while fetching the chunk), the cached
 * promise is cleared so the next call tries again instead of failing forever.
 */
export function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist")
      .then((pdfJsModule) => {
        pdfJsModule.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        return pdfJsModule;
      })
      .catch((loadError: unknown) => {
        pdfJsModulePromise = null;
        throw loadError;
      });
  }
  return pdfJsModulePromise;
}
