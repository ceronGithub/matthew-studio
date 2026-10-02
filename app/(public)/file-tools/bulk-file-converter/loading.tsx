/**
 * FILE: app/(public)/file-tools/bulk-file-converter/loading.tsx
 * ROLE: Public — loading placeholder for the Bulk File Converter page.
 *
 * PURPOSE:
 * Shown while the page streams in (Rule 31.10). Mirrors the real layout - a
 * title, the mode switch and the workspace panel - using the shared
 * skeletonBlock pulse (Rule 25.2).
 */
import "../../../styles/bulkFileConverter.css";

export default function BulkFileConverterLoading() {
  return (
    <section className="bulkConverterPage" aria-busy="true" aria-label="Loading Bulk File Converter">
      <div className="bulkConverterSkeletonTitle skeletonBlock" />
      <div className="bulkConverterSkeletonSwitch skeletonBlock" />
      <div className="bulkConverterSkeletonPanel skeletonBlock" />
    </section>
  );
}
