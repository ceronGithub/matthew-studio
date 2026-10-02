/**
 * FILE: app/(public)/file-tools/bulk-file-converter/BulkFileConverterTool.tsx
 * ROLE: Public — the interactive part of the Bulk File Converter page.
 *
 * PURPOSE:
 * Shows the Convert / Rename by Invoice mode switch and the matching workspace
 * (bulk_file_converter_and_pdf_renamer_specification.md Section 1: one tool,
 * two modes). Split out of page.tsx because the active mode is state, and the
 * page itself stays a Server Component that only exports metadata (Rule 31.1).
 *
 * DATA FLOW:
 * 1. activeMode starts as "convert".
 * 2. Clicking a tab (or pressing the left/right arrow keys on one) changes it.
 * 3. Both workspaces stay mounted and only the inactive one is hidden, so files
 *    already added in one mode are not lost when the visitor peeks at the other.
 */
"use client";

import { useRef, useState } from "react";
import ConvertWorkspace from "./convert/ConvertWorkspace";
import InvoiceRenameWorkspace from "./rename/InvoiceRenameWorkspace";
import "../../../styles/bulkFileConverter.css";

type ToolMode = "convert" | "rename";

const toolModes: { modeId: ToolMode; label: string }[] = [
  { modeId: "convert", label: "Convert" },
  { modeId: "rename", label: "Rename by Invoice" },
];

export default function BulkFileConverterTool() {
  const [activeMode, setActiveMode] = useState<ToolMode>("convert");
  const tabButtonRefs = useRef<Record<ToolMode, HTMLButtonElement | null>>({
    convert: null,
    rename: null,
  });

  /**
   * handleTabKeyDown
   * Lets keyboard users move between the two tabs with the arrow keys, the
   * standard behaviour for a tab list. Focus moves together with the selection.
   */
  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const isArrowKey = event.key === "ArrowLeft" || event.key === "ArrowRight";
    if (!isArrowKey) return;

    event.preventDefault();
    const nextMode: ToolMode = activeMode === "convert" ? "rename" : "convert";
    setActiveMode(nextMode);
    tabButtonRefs.current[nextMode]?.focus();
  }

  return (
    <div className="bulkConverterTool">
      <div className="modeSwitch" role="tablist" aria-label="Bulk File Converter mode">
        {toolModes.map((toolMode) => {
          const isActive = toolMode.modeId === activeMode;
          return (
            <button
              key={toolMode.modeId}
              ref={(element) => {
                tabButtonRefs.current[toolMode.modeId] = element;
              }}
              type="button"
              role="tab"
              id={`${toolMode.modeId}Tab`}
              aria-selected={isActive}
              aria-controls={`${toolMode.modeId}Panel`}
              tabIndex={isActive ? 0 : -1}
              className={isActive ? "modeSwitchButton modeSwitchButtonActive" : "modeSwitchButton"}
              onClick={() => setActiveMode(toolMode.modeId)}
              onKeyDown={handleTabKeyDown}
            >
              {toolMode.label}
            </button>
          );
        })}
      </div>

      <section
        className="modePanel"
        role="tabpanel"
        id="convertPanel"
        aria-labelledby="convertTab"
        hidden={activeMode !== "convert"}
      >
        <ConvertWorkspace />
      </section>

      <section
        className="modePanel"
        role="tabpanel"
        id="renamePanel"
        aria-labelledby="renameTab"
        hidden={activeMode !== "rename"}
      >
        <InvoiceRenameWorkspace />
      </section>
    </div>
  );
}
