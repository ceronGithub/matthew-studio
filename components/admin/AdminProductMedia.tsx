/**
 * FILE: components/admin/AdminProductMedia.tsx
 * ROLE: Admin/super-admin only — rendered by AdminProductForm.tsx,
 * edit mode only (a productId must exist before media can be
 * attached to products/<productId>/...).
 *
 * PURPOSE:
 * Task 27 — replaces the Task 23 "Coming soon" placeholder with the
 * real Media section: Cover Image, Gallery Images, Preview Video.
 * Closes product_media_upload_specification.md end to end for
 * /admin/products (build sequence item 9).
 *
 * showToast is passed down from AdminProductForm (the nearest owning
 * parent) rather than this component owning its own useToast instance
 * — Rule 22.4's sub-component pattern, one toast stack per page.
 */
"use client";

import { useAdminProductMedia } from "@/lib/hooks/useAdminProductMedia";
import AdminProductMediaCover from "@/components/admin/AdminProductMediaCover";
import AdminProductMediaGallery from "@/components/admin/AdminProductMediaGallery";
import AdminProductMediaVideo from "@/components/admin/AdminProductMediaVideo";

interface AdminProductMediaProps {
  productId: string;
  showToast: (message: string, type: "success" | "error" | "warning") => void;
}

export default function AdminProductMedia({ productId, showToast }: AdminProductMediaProps) {
  const {
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
  } = useAdminProductMedia(productId);

  if (isLoading) {
    return (
      <div className="adminProductMediaWrapper">
        <div className="adminProductFormSkeletonLine skeletonBlock" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="adminProductMediaWrapper adminProductFormErrorState">
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div className="adminProductMediaWrapper">
      <AdminProductMediaCover
        coverImageUrl={coverImageUrl}
        isBusy={isCoverBusy}
        onUpload={uploadCover}
        showToast={showToast}
      />
      <AdminProductMediaGallery
        images={galleryImages}
        isBusy={isGalleryBusy}
        onUpload={uploadGalleryImage}
        onRemove={removeGalleryImage}
        showToast={showToast}
      />
      <AdminProductMediaVideo
        previewVideoUrl={previewVideoUrl}
        isBusy={isVideoBusy}
        onUpload={uploadVideo}
        onRemove={removeVideo}
        showToast={showToast}
      />
    </div>
  );
}
