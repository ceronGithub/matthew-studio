/**
 * FILE: services/googleDrive.ts
 * PURPOSE:
 * Uploads database backup archives to Google Drive as an offsite
 * redundancy destination alongside Cloudflare R2 (Rule 35.7 / 40.2).
 * Used only by scripts/runBackup.js (task-102) — never called from
 * any Next.js route or component.
 *
 * Authenticates via a Google Service Account — no user OAuth flow.
 * All operations are server-side only, and this file is only ever
 * imported from a standalone script, never from app/ code.
 */
import { google } from "googleapis";
import { Readable } from "stream";

/**
 * getDriveClient
 * Authenticates with Google Drive using the service account
 * credentials and returns a ready-to-use Drive API client.
 * Private key newlines arrive escaped in .env ("\\n") and must be
 * un-escaped before use, or the JWT signature step fails silently.
 */
async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * uploadToDrive
 * Uploads a file buffer into the configured backup folder and makes
 * it viewable by anyone with the link (no sign-in required), so the
 * super-admin Backups page (task-105) can link straight to it.
 *
 * @param fileName - Display name in Drive (e.g. "backup-2026-09-13.sql.gz")
 * @param buffer   - File content as a Buffer
 * @param mimeType - MIME type (e.g. "application/gzip")
 */
export async function uploadToDrive(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileId: string; viewLink: string }> {
  const drive = await getDriveClient();

  const uploadResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = uploadResponse.data.id!;
  const viewLink = uploadResponse.data.webViewLink!;

  // Anyone with the link can view — no sign-in required, so the
  // Backups page can link directly to each archive.
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return { fileId, viewLink };
}

/**
 * deleteFromDrive
 * Permanently deletes a backup archive from Google Drive by file ID.
 * Not called by any current flow (backups are retained, never
 * auto-pruned) — exported for future retention-policy cleanup.
 */
export async function deleteFromDrive(fileId: string): Promise<void> {
  const drive = await getDriveClient();
  await drive.files.delete({ fileId });
}
