/**
 * FILE: components/fileTools/RenamePatternBuilder.tsx
 * ROLE: Public — File Tools "Rename PDFs" workspace.
 *
 * PURPOSE:
 * The box where the visitor sets how renamed files are called
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 3.2): a text
 * field with the pattern, one button per token that adds it, and a Reset button
 * for the default pattern. Presentational only: the parent owns the pattern
 * (hooks/useInvoiceRename.ts), which is kept in memory and never saved in v1.
 *
 * DATA FLOW:
 * 1. Typing calls onPatternChange(text).
 * 2. A token button calls onInsertToken("{date}").
 * 3. Reset calls onReset().
 */
"use client";

import { useId } from "react";
import "../../app/styles/fileTools.css";

interface RenamePatternBuilderProps {
  pattern: string;
  /** Tokens offered as buttons, written with braces, e.g. "{invoiceNumber}". */
  tokens: readonly string[];
  /** false = the pattern has no token, so every file would get the same name. */
  patternHasToken: boolean;
  onPatternChange: (pattern: string) => void;
  onInsertToken: (token: string) => void;
  onReset: () => void;
  isDisabled?: boolean;
}

export default function RenamePatternBuilder({
  pattern,
  tokens,
  patternHasToken,
  onPatternChange,
  onInsertToken,
  onReset,
  isDisabled = false,
}: RenamePatternBuilderProps) {
  // Links the label to the input and the hint text to the input for screen readers.
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  return (
    <section className="renamePatternSection" aria-label="Rename pattern">
      <label htmlFor={inputId} className="renamePatternLabel">
        File name pattern
      </label>

      <input
        id={inputId}
        type="text"
        className="invoicePreviewInput"
        value={pattern}
        onChange={(event) => onPatternChange(event.target.value)}
        disabled={isDisabled}
        aria-describedby={hintId}
        autoComplete="off"
        spellCheck={false}
      />

      <p id={hintId} className={patternHasToken ? "renamePatternHint" : "renamePatternHint renamePatternHintWarning"}>
        {patternHasToken
          ? "A detail that was not found is left out of the name. The name always ends in .pdf."
          : "Add at least one detail below so each file gets its own name."}
      </p>

      <div className="renamePatternActions">
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            className="convertSecondaryButton"
            onClick={() => onInsertToken(token)}
            disabled={isDisabled}
          >
            {token}
          </button>
        ))}
        <button type="button" className="convertSecondaryButton" onClick={onReset} disabled={isDisabled}>
          Reset
        </button>
      </div>
    </section>
  );
}
