/**
 * FILE: components/admin/AdminProductMediaGallery.tsx
 * ROLE: Admin/super-admin only — rendered by AdminProductMedia.tsx.
 *
 * PURPOSE:
 * Task 27 — gallery section of the Media UI. Multi-file picker,
 * thumbnail strip, "Add More" up to 8, per-image delete. Reorder drag
 * handles deferred per Task 25's note — add/delete/view only for now.
 */
"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { GalleryImage } from "@/lib/hooks/useAdminProductMedia";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_GALLERY_IMAGES = 8;

interface AdminProductMediaGalleryProps {
  images: GalleryImage[];
  isBusy: boolean;
  onUpload: (file: File) => Promise<{ success: boolean; message: string }>;
  onRemove: (imageId: string) => Promise<{ success: boolean; message: string }>;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function AdminProductMediaGallery({
  images,
  isBusy,
  onUpload,
  onRemove,
  showToast,
}: AdminProductMediaGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFull = images.length >= MAX_GALLERY_IMAGES;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (isFull) {
      showToast(`✕ Gallery is full. Maximum ${MAX_GALLERY_IMAGES} images per product.`, "error");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast("✕ Only JPEG, PNG, WebP, and GIF files are accepted.", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast("✕ File is too large. Maximum size is 5MB.", "error");
      return;
    }

    const result = await onUpload(file);
    showToast(result.success ? "✓ Image added to gallery." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  async function handleRemove(imageId: string) {
    const result = await onRemove(imageId);
    showToast(result.success ? "✓ Image removed." : `✕ ${result.message}`, result.success ? "success" : "error");
  }

  return (
    <section className="adminProductMediaSection">
      <h3 className="adminProductMediaSectionTitle">
        Gallery images ({images.length} / {MAX_GALLERY_IMAGES})
      </h3>
      <div className="adminProductMediaGalleryStrip">
        {images.length === 0 && <span className="adminProductMediaCoverEmpty">No gallery images yet</span>}
        {images.map((image) => (
          <div key={image.id} className="adminProductMediaGalleryThumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="Product gallery" />
            <button
              type="button"
              className="adminProductMediaGalleryDelete"
              disabled={isBusy}
              aria-label="Remove image"
              onClick={() => handleRemove(image.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        hidden
        id="adminProductMediaGalleryInput"
      />
      <button
        type="button"
        className="adminProductMediaButton"
        disabled={isBusy || isFull}
        onClick={() => inputRef.current?.click()}
      >
        {isBusy ? <Loader2 size={16} className="adminProductFormSpin" /> : <ImagePlus size={16} />}
        {isBusy ? "Uploading…" : "Add image"}
      </button>
    </section>
  );
}
