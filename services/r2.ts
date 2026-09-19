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
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
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

export interface R2ObjectSummary {
  key: string;
  url: string;
  sizeBytes: number;
  lastModified: string | null;
}

export interface R2ListResult {
  objects: R2ObjectSummary[];
  nextCursor: string | null;
}

/**
 * listR2Objects
 * Lists one page of objects in the R2 bucket, optionally limited to a
 * folder prefix (e.g. "products/"). Used by the super-admin media
 * library (GET /api/superadmin/media, task-119).
 *
 * R2 pagination is cursor-based, not page-number-based: pass the
 * previous call's nextCursor back in as cursor to get the next page.
 * nextCursor is null once the last page has been returned.
 *
 * The url on each object is the public CDN URL — the caller is
 * responsible for never listing private folders (buyer download
 * files are private and must only ever be served via
 * getSignedDownloadUrl above).
 *
 * @param prefix - Only return keys starting with this string
 * @param cursor - R2 continuation token from a previous call
 * @param limit  - Max objects to return in this page
 */
export async function listR2Objects(options: {
  prefix?: string;
  cursor?: string;
  limit: number;
}): Promise<R2ListResult> {
  const response = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Prefix: options.prefix || undefined,
      ContinuationToken: options.cursor || undefined,
      MaxKeys: options.limit,
    })
  );

  const objects: R2ObjectSummary[] = (response.Contents ?? [])
    // R2 can return zero-byte "folder marker" keys ending in "/" — not real files
    .filter((item) => item.Key && !item.Key.endsWith("/"))
    .map((item) => ({
      key: item.Key as string,
      url: `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL}/${item.Key}`,
      sizeBytes: item.Size ?? 0,
      lastModified: item.LastModified ? item.LastModified.toISOString() : null,
    }));

  return {
    objects,
    nextCursor: response.IsTruncated ? response.NextContinuationToken ?? null : null,
  };
}
