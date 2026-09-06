/**
 * FILE: lib/hooks/useAdminProductMedia.ts
 * PURPOSE:
 * Task 27 — data + actions for the Media section of AdminProductForm
 * (product_media_upload_specification.md Sections 4, 8, 9). Only used
 * in edit mode (a productId must already exist to attach media to).
 *
 * Loads the product's current cover/gallery/video state via the
 * existing GET /api/admin/products/[productId] route (Task 20 — it
 * already includes galleryImages and the cover/video URL fields), then
 * exposes upload/remove actions for Tasks 24-26's routes. Each action
 * returns { success, message } so the calling component decides how
 * to toast — this hook never renders anything itself.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface GalleryImage {
  id: string;
  url: string;
  sortOrder: number;
}

interface ActionResult {
  success: boolean;
  message: string;
}

async function postFile(url: string, file: File): Promise<{ result: ActionResult; data: any }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(url, { method: "POST", headers: getCsrfHeader(), body: formData });
  const json = await response.json();
  return { result: { success: Boolean(json.success), message: json.message ?? "" }, data: json.data };
}

export function useAdminProductMedia(productId: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  const [isCoverBusy, setIsCoverBusy] = useState(false);
  const [isVideoBusy, setIsVideoBusy] = useState(false);
  const [isGalleryBusy, setIsGalleryBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/admin/products/${productId}`);
        const result = await response.json();
        if (cancelled) return;
        if (!result.success) {
          setLoadError(result.message);
          setIsLoading(false);
          return;
        }
        setCoverImageUrl(result.data.coverImageUrl ?? null);
        setPreviewVideoUrl(result.data.previewVideoUrl ?? null);
        setGalleryImages(result.data.galleryImages ?? []);
        setIsLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError("We couldn't reach the server. Check your connection and try again.");
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const uploadCover = useCallback(
    async (file: File): Promise<ActionResult> => {
      setIsCoverBusy(true);
      try {
        const { result, data } = await postFile(`/api/admin/products/${productId}/media/cover`, file);
        if (result.success) setCoverImageUrl(data.coverImageUrl);
        return result;
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      } finally {
        setIsCoverBusy(false);
      }
    },
    [productId]
  );

  const uploadVideo = useCallback(
    async (file: File): Promise<ActionResult> => {
      setIsVideoBusy(true);
      try {
        const { result, data } = await postFile(`/api/admin/products/${productId}/media/video`, file);
        if (result.success) setPreviewVideoUrl(data.previewVideoUrl);
        return result;
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      } finally {
        setIsVideoBusy(false);
      }
    },
    [productId]
  );

  const removeVideo = useCallback(async (): Promise<ActionResult> => {
    setIsVideoBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/media/video`, {
        method: "DELETE",
        headers: getCsrfHeader(),
      });
      const json = await response.json();
      if (json.success) setPreviewVideoUrl(null);
      return { success: Boolean(json.success), message: json.message ?? "" };
    } catch {
      return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
    } finally {
      setIsVideoBusy(false);
    }
  }, [productId]);

  const uploadGalleryImage = useCallback(
    async (file: File): Promise<ActionResult> => {
      setIsGalleryBusy(true);
      try {
        const { result, data } = await postFile(`/api/admin/products/${productId}/media/gallery`, file);
        if (result.success) setGalleryImages((current) => [...current, data.galleryImage]);
        return result;
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      } finally {
        setIsGalleryBusy(false);
      }
    },
    [productId]
  );

  const removeGalleryImage = useCallback(
    async (imageId: string): Promise<ActionResult> => {
      setIsGalleryBusy(true);
      try {
        const response = await fetch(`/api/admin/products/${productId}/media/gallery/${imageId}`, {
          method: "DELETE",
          headers: getCsrfHeader(),
        });
        const json = await response.json();
        if (json.success) setGalleryImages((current) => current.filter((image) => image.id !== imageId));
        return { success: Boolean(json.success), message: json.message ?? "" };
      } catch {
        return { success: false, message: "We couldn't reach the server. Check your connection and try again." };
      } finally {
        setIsGalleryBusy(false);
      }
    },
    [productId]
  );

  return {
    isLoading,
    loadError,
    coverImageUrl,
    previewVideoUrl,
    galleryImages,
    isCoverBusy,
    isVideoBusy,
    isGalleryBusy,
    uploadCover,
    uploadVideo,
    removeVideo,
    uploadGalleryImage,
    removeGalleryImage,
  };
}
