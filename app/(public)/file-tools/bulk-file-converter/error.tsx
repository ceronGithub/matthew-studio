/**
 * FILE: app/(public)/file-tools/bulk-file-converter/error.tsx
 * ROLE: Public — error boundary for the Bulk File Converter page.
 *
 * PURPOSE:
 * Shows a friendly message and a retry button if the tool crashes while
 * rendering, instead of a blank page (Rule 31.10). The raw error text is never
 * shown to the visitor (Rule 34.1).
 */
"use client";

import "../../../styles/bulkFileConverter.css";

export default function BulkFileConverterError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="bulkConverterError" role="alert">
      <h1 className="sectionTitle">The converter couldn&apos;t load</h1>
      <p className="sectionSubtitle">
        Something stopped the tool from opening. Your files were not uploaded anywhere. Try again, and
        if it keeps happening, reload the page.
      </p>
      <button type="button" className="buttonPrimary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
