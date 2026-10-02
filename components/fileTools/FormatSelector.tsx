/**
 * FILE: components/fileTools/FormatSelector.tsx
 * ROLE: Public — shared by the File Tools "Convert" workspace.
 *
 * PURPOSE:
 * Lets the visitor pick the one output format applied to every queued file
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 2.2 and 2.3,
 * step 3). It only shows the formats the parent passes in: the parent works
 * out which outputs make sense for the queued file types (for example JPG,
 * PNG, WEBP, PDF for images; JPG, PNG, TXT for PDFs) and hides this selector
 * until at least one valid file has been added.
 *
 * DATA FLOW:
 * 1. Parent passes `formats` and the currently chosen `selectedFormat`.
 * 2. A native radio group renders one option per format, so arrow keys and
 *    screen readers work without extra code.
 * 3. Choosing an option calls onFormatChange(format); the parent stores it.
 */
"use client";

import { useId } from "react";
import "../../app/styles/fileTools.css";

interface FormatSelectorProps {
  /** Output formats to offer, lowercase ("jpg", "png", "pdf" ...). */
  formats: readonly string[];
  /** The format that is currently chosen. */
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  /** Locks the choice, e.g. while a conversion is running. */
  isDisabled?: boolean;
}

export default function FormatSelector({
  formats,
  selectedFormat,
  onFormatChange,
  isDisabled = false,
}: FormatSelectorProps) {
  // Radios in one group must share a name; useId keeps it unique if two selectors ever share a page.
  const radioGroupName = useId();

  // Nothing to choose from, so show nothing rather than an empty control.
  if (formats.length === 0) return null;

  return (
    <section className="formatSelectorSection">
      <fieldset className="formatSelectorFieldset" disabled={isDisabled}>
        <legend className="formatSelectorLegend">Convert to</legend>
        <div className="formatSelectorOptions">
          {formats.map((format) => (
            <label
              key={format}
              className={
                format === selectedFormat
                  ? "formatSelectorOption formatSelectorOptionSelected"
                  : "formatSelectorOption"
              }
            >
              <input
                className="formatSelectorRadio"
                type="radio"
                name={radioGroupName}
                value={format}
                checked={format === selectedFormat}
                onChange={() => onFormatChange(format)}
              />
              <span>{format.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
