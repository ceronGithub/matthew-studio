/**
 * FILE: app/(public)/file-tools/bulk-file-converter/page.tsx
 * ROLE: Public — the Bulk File Converter tool page, served at
 * "/file-tools/bulk-file-converter". No account needed.
 *
 * PURPOSE:
 * Page shell for the one tool with two modes: Convert (image/doc formats) and
 * Rename by Invoice (PDFs). A static folder for this slug takes precedence over
 * the generic /file-tools/[slug] product-detail route, so the "Bulk File
 * Converter" product card now opens the working tool instead of a detail page.
 *
 * DATA FLOW:
 * 1. This Server Component only renders the header text and exports metadata
 *    (Rule 31.9).
 * 2. BulkFileConverterTool (client) owns the mode switch and both workspaces.
 * 3. Everything runs in the visitor's browser - no API call, no database.
 */
import type { Metadata } from "next";
import BulkFileConverterTool from "./BulkFileConverterTool";
import "../../../styles/bulkFileConverter.css";

export const metadata: Metadata = {
  title: "Bulk File Converter | Matthew Studio",
  description:
    "Convert a batch of files to another format, or rename invoice PDFs from the invoice number, date and bill-to inside them. Runs in your browser.",
  openGraph: {
    title: "Bulk File Converter | Matthew Studio",
    description:
      "Convert a batch of files to another format, or rename invoice PDFs from the invoice number, date and bill-to inside them. Runs in your browser.",
    images: ["/og-home.png"],
  },
};

export default function BulkFileConverterPage() {
  return (
    <section className="bulkConverterPage">
      <div className="bulkConverterHeader">
        <p className="eyebrow">File Tools</p>
        <h1 className="sectionTitle">Bulk File Converter</h1>
        <p className="sectionSubtitle">
          Convert a whole batch of files to another format in one go, or rename invoice PDFs
          using the details written inside them.
        </p>
        <p className="bulkConverterNote">Your files stay on your device. Nothing is uploaded.</p>
      </div>

      <BulkFileConverterTool />
    </section>
  );
}
