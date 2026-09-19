/**
 * FILE: components/content/ContentFieldRenderer.tsx
 * ROLE: Super-admin only — rendered inside SectionForm.tsx.
 *
 * PURPOSE:
 * task-115's "form fields matching the selected section's data shape"
 * (Section 3.7). No ContentSection rows are seeded yet (confirmed —
 * zero prisma.contentSection.findMany() callers exist anywhere else
 * in the codebase before this task), so there is no real per-section
 * shape to hard-code a field-config map against yet without guessing.
 * Ships a TYPE-AWARE generic renderer instead: readable, typed inputs
 * for primitive fields (text/textarea/number/boolean), a simple
 * add/remove list editor for arrays of strings, and a read-only
 * preview (with a plain-English note, never raw JSON dumped at the
 * user) for nested objects/arrays-of-objects, since those vary too
 * much per section to genericize into flat inputs without becoming
 * unreadable (Rule 17). This still isn't "a fully generic JSON
 * editor" — every field gets its own typed control, not a textarea of
 * raw JSON — but per-sectionKey field configs (e.g. a dedicated
 * "pricing tier" list editor) are a natural follow-up once real
 * sections exist to design them against.
 */
"use client";

const LONG_TEXT_THRESHOLD = 80;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function toLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

interface ContentFieldRendererProps {
  data: Record<string, unknown>;
  onChange: (nextData: Record<string, unknown>) => void;
}

export default function ContentFieldRenderer({ data, onChange }: ContentFieldRendererProps) {
  const fieldKeys = Object.keys(data);

  function updateField(key: string, value: unknown) {
    onChange({ ...data, [key]: value });
  }

  if (fieldKeys.length === 0) {
    return <p className="contentFieldEmptyNote">This section has no fields yet.</p>;
  }

  return (
    <div className="contentFieldList">
      {fieldKeys.map((key) => {
        const value = data[key];
        const fieldId = `contentField-${key}`;

        if (typeof value === "string") {
          const isLong = value.length > LONG_TEXT_THRESHOLD || value.includes("\n");
          return (
            <div className="contentFieldGroup" key={key}>
              <label className="contentFieldLabel" htmlFor={fieldId}>
                {toLabel(key)}
              </label>
              {isLong ? (
                <>
                  <textarea
                    id={fieldId}
                    className="contentFieldTextarea"
                    value={value}
                    onChange={(event) => updateField(key, event.target.value)}
                    rows={4}
                  />
                  <span className="contentFieldCounter">{value.length} characters</span>
                </>
              ) : (
                <input
                  id={fieldId}
                  type="text"
                  className="contentFieldInput"
                  value={value}
                  onChange={(event) => updateField(key, event.target.value)}
                />
              )}
            </div>
          );
        }

        if (typeof value === "number") {
          return (
            <div className="contentFieldGroup" key={key}>
              <label className="contentFieldLabel" htmlFor={fieldId}>
                {toLabel(key)}
              </label>
              <input
                id={fieldId}
                type="number"
                className="contentFieldInput"
                value={value}
                onChange={(event) => updateField(key, Number(event.target.value))}
              />
            </div>
          );
        }

        if (typeof value === "boolean") {
          return (
            <div className="contentFieldGroup contentFieldGroup--checkbox" key={key}>
              <label className="contentFieldCheckboxLabel" htmlFor={fieldId}>
                <input
                  id={fieldId}
                  type="checkbox"
                  className="contentFieldCheckbox"
                  checked={value}
                  onChange={(event) => updateField(key, event.target.checked)}
                />
                {toLabel(key)}
              </label>
            </div>
          );
        }

        if (isStringArray(value)) {
          return (
            <div className="contentFieldGroup" key={key}>
              <span className="contentFieldLabel">{toLabel(key)}</span>
              <div className="contentFieldListEditor">
                {value.map((item, index) => (
                  <div className="contentFieldListRow" key={`${key}-${index}`}>
                    <input
                      type="text"
                      className="contentFieldInput"
                      value={item}
                      onChange={(event) => {
                        const nextItems = [...value];
                        nextItems[index] = event.target.value;
                        updateField(key, nextItems);
                      }}
                    />
                    <button
                      type="button"
                      className="contentFieldListRemoveButton"
                      onClick={() => updateField(key, value.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={`Remove item ${index + 1} from ${toLabel(key)}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="contentFieldListAddButton"
                  onClick={() => updateField(key, [...value, ""])}
                >
                  + Add item
                </button>
              </div>
            </div>
          );
        }

        // Nested object or array-of-objects — too varied to genericize
        // into flat inputs without becoming unreadable (Rule 17).
        // Shown read-only with a plain note rather than pretending
        // this field is editable here.
        return (
          <div className="contentFieldGroup" key={key}>
            <span className="contentFieldLabel">{toLabel(key)}</span>
            <p className="contentFieldComplexNote">
              This field has a nested structure not yet editable in this form. Ask a developer to add a
              dedicated editor for &ldquo;{toLabel(key)}&rdquo; if it needs regular updates.
            </p>
          </div>
        );
      })}
    </div>
  );
}
