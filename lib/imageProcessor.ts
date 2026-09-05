/**
 * FILE: lib/imageProcessor.ts
 * PURPOSE:
 * Processes uploaded images before storing them in Cloudflare R2
 * (Rule 35.6) — resizes to a max dimension, compresses quality, and
 * converts to WebP. First consumer: buyer avatar uploads
 * (buyer_account_specification.md Section 4.2), sized smaller than
 * the 1200px default since avatars are always displayed small.
 */
import sharp from "sharp";

interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function processImage(buffer: Buffer, options: ProcessImageOptions = {}): Promise<Buffer> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 80 } = options;

  return sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: "inside", // Maintain aspect ratio — never stretch or crop
      withoutEnlargement: true, // Never upscale small images
    })
    .webp({ quality })
    .toBuffer();
}
