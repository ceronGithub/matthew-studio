/**
 * FILE: components/media/MediaLibraryCard.tsx
 * ROLE: Super-admin only — one file tile inside MediaLibraryGrid.
 *
 * PURPOSE:
 * task-120: shows a preview (or a file-type icon for videos and other
 * non-image files), the file name, its folder, size and upload date,
 * and the "Copy URL" action. Copying itself is handled by the parent
 * so the toast and the "Copied" flash stay in one place.
 */
"use client";

import { useState } from "react";
import { Check, Copy, File as FileIcon, Film, ImageOff } from "lucide-react";
import type { MediaLibraryItem } from "@/lib/hooks/useMediaLibrary";

const IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png", "gif", "avif", "svg"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];

interface MediaLibraryCardProps {
  item: MediaLibraryItem;
  isCopied: boolean;
  onCopyUrl: (item: MediaLibraryItem) => void;
}

/**
 * splitKey
 * Breaks an R2 key like "products/abc/cover.webp" into the file name
 * ("cover.webp"), the folder path ("products/abc") and the lowercase
 * extension ("webp", or "" when the file has none).
 */
function splitKey(key: string) {
  const lastSlashIndex = key.lastIndexOf("/");
  const fileName = key.slice(lastSlashIndex + 1);
  const folderPath = lastSlashIndex === -1 ? "" : key.slice(0, lastSlashIndex);
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase();
  return { fileName, folderPath, extension };
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function MediaLibraryCard({ item, isCopied, onCopyUrl }: MediaLibraryCardProps) {
  // If the image URL is broken (wrong public URL setting, deleted file)
  // we swap to the icon tile instead of showing a broken-image glyph.
  const [hasImageFailed, setHasImageFailed] = useState(false);

  const { fileName, folderPath, extension } = splitKey(item.key);
  const isImage = IMAGE_EXTENSIONS.includes(extension) && !hasImageFailed;
  const isVideo = VIDEO_EXTENSIONS.includes(extension);

  return (
    <li className="superAdminMediaCard">
      <div className="superAdminMediaPreview">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 host is not in next.config images; same approach as AdminProductMediaCover
          <img src={item.url} alt={fileName} loading="lazy" onError={() => setHasImageFailed(true)} />
        ) : (
          <div className="superAdminMediaPreviewIcon">
            {hasImageFailed ? <ImageOff size={32} /> : isVideo ? <Film size={32} /> : <FileIcon size={32} />}
            <span>{hasImageFailed ? "Preview unavailable" : extension ? extension.toUpperCase() : "FILE"}</span>
          </div>
        )}
      </div>

      <div className="superAdminMediaDetails">
        <p className="superAdminMediaFileName">{fileName}</p>
        <p className="superAdminMediaFolderPath">{folderPath || "(bucket root)"}</p>
        <p className="superAdminMediaMeta">
          {formatFileSize(item.sizeBytes)} · {formatDate(item.lastModified)}
        </p>
      </div>

      <button
        type="button"
        className="superAdminMediaCopyButton"
        onClick={() => onCopyUrl(item)}
        aria-label={`Copy URL of ${fileName}`}
      >
        {isCopied ? <Check size={16} /> : <Copy size={16} />}
        {isCopied ? "Copied" : "Copy URL"}
      </button>
    </li>
  );
}
