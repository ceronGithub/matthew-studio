/**
 * FILE: components/admin/AdminProductMediaCover.tsx
 * ROLE: Admin/super-admin only — rendered by AdminProductMedia.tsx.
 *
 * PURPOSE:
 * Task 27 — cover image section of the Media UI. Single file picker,
 * shows current image + "Replace". Client-side type/size validation
 * before any network request (Section 4) — matches Task 24's server
 * limits exactly so a rejected file never even starts uploading.
 */
"use client";

import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface AdminProductMediaCoverProps {
  coverImageUrl: string | null;
  isBusy: boolean;
  onUpload: (file: File) => Promise<{ success: boolean; message: string }>;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function AdminProductMediaCover({
  coverImageUrl,
  isBusy,
  onUpload,
  showToast,
}: AdminProductMediaCoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    // Client-side validation — never let an oversized/unsupported file
    // start uploading only to fail server-side (Section 4).
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast("✕ Only JPEG, PNG, WebP, and GIF files are accepted.", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast("✕ File is too large. Maximum size is 5MB.", "error");
      return;
    }

    const result = await onUpload(file);
    showToast(result.success ? "✓ Cover image uploaded." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  return (
    <section className="adminProductMediaSection">
      <h3 className="adminProductMediaSectionTitle">Cover image</h3>
      <div className="adminProductMediaCoverRow">
        <div className="adminProductMediaCoverPreview">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImageUrl} alt="Product cover" />
          ) : (
            <span className="adminProductMediaCoverEmpty">No cover image yet</span>
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            hidden
            id="adminProductMediaCoverInput"
          />
          <button
            type="button"
            className="adminProductMediaButton"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {isBusy ? <Loader2 size={16} className="adminProductFormSpin" /> : <ImagePlus size={16} />}
            {isBusy ? "Uploading…" : coverImageUrl ? "Replace" : "Upload cover image"}
          </button>
        </div>
      </div>
    </section>
  );
}
