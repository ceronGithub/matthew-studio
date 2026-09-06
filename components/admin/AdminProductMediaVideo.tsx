/**
 * FILE: components/admin/AdminProductMediaVideo.tsx
 * ROLE: Admin/super-admin only — rendered by AdminProductMedia.tsx.
 *
 * PURPOSE:
 * Task 27 — preview video section of the Media UI. Single file
 * picker, <video> preview once uploaded, Replace/Remove. Client-side
 * validation matches Task 26's server limits (video/mp4, video/webm,
 * video/quicktime; up to 100MB).
 */
"use client";

import { useRef } from "react";
import { Loader2, Trash2, Video } from "lucide-react";

const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface AdminProductMediaVideoProps {
  previewVideoUrl: string | null;
  isBusy: boolean;
  onUpload: (file: File) => Promise<{ success: boolean; message: string }>;
  onRemove: () => Promise<{ success: boolean; message: string }>;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function AdminProductMediaVideo({
  previewVideoUrl,
  isBusy,
  onUpload,
  onRemove,
  showToast,
}: AdminProductMediaVideoProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast("✕ Only MP4, WebM, and MOV video files are accepted.", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast("✕ File is too large. Maximum size is 100MB.", "error");
      return;
    }

    const result = await onUpload(file);
    showToast(result.success ? "✓ Preview video uploaded." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  async function handleRemove() {
    const result = await onRemove();
    showToast(result.success ? "✓ Preview video removed." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  return (
    <section className="adminProductMediaSection">
      <h3 className="adminProductMediaSectionTitle">Preview video</h3>
      {previewVideoUrl ? (
        <video className="adminProductMediaVideoPreview" src={previewVideoUrl} controls />
      ) : (
        <span className="adminProductMediaCoverEmpty">No preview video yet</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        hidden
        id="adminProductMediaVideoInput"
      />
      <div className="adminProductMediaVideoActions">
        <button
          type="button"
          className="adminProductMediaButton"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {isBusy ? <Loader2 size={16} className="adminProductFormSpin" /> : <Video size={16} />}
          {isBusy ? "Uploading…" : previewVideoUrl ? "Replace" : "Upload video"}
        </button>
        {previewVideoUrl && (
          <button type="button" className="adminProductMediaButtonDanger" disabled={isBusy} onClick={handleRemove}>
            <Trash2 size={16} />
            Remove
          </button>
        )}
      </div>
    </section>
  );
}
