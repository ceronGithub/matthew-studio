/**
 * FILE: services/r2.ts
 * PURPOSE:
 * Initializes the Cloudflare R2 client (S3-compatible, Rule 35.6) and
 * exports a signed-URL helper for buyer downloads
 * (buyer_account_specification.md Section 4.1).
 *
 * Buyer download files are private objects — never served via the
 * public CDN base URL the way product cover images are. Every
 * download request mints a short-lived signed GET URL scoped to the
 * exact r2Key stored on that buyer's BuyerDownload row, so a guessed
 * or shared URL stops working once it expires.
 *
 * Server-side only — never import this file in a "use client" component.
 */
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * getSignedDownloadUrl
 * Mints a time-limited signed URL for a private R2 object. Used by
 * /api/buyer/downloads/[id]/file so a buyer's download link can't be
 * copied and reused indefinitely, or reached by anyone who isn't
 * signed in as the owning buyer.
 *
 * @param key           - R2 object key (BuyerDownload.r2Key)
 * @param expiresInSecs - Signed URL lifetime, default 5 minutes
 */
export async function getSignedDownloadUrl(key: string, expiresInSecs = 300): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSecs });
}

/**
 * uploadToR2
 * Uploads a file buffer to Cloudflare R2 and returns the public CDN
 * URL. Used for non-gated assets (product images/videos) — buyer
 * download files instead store their r2Key and are served only via
 * getSignedDownloadUrl above.
 */
export async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

/**
 * deleteFromR2
 * Permanently deletes a file from Cloudflare R2. Never leave orphaned
 * files behind when a product/download asset is replaced or removed.
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
    })
  );
}
