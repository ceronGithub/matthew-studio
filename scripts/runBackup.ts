/**
 * FILE: scripts/runBackup.ts
 * PURPOSE:
 * Standalone database backup runner (Rule 40.1 / 40.5). Dumps the
 * database via pg_dump, gzips it, uploads independently to Cloudflare
 * R2 and Google Drive, and records the result on a BackupLog row.
 *
 * Never triggered by an incoming request of any kind — invoked only
 * via `npm run backup` or the GitHub Actions cron/workflow_dispatch
 * in .github/workflows/database-backup.yml (task-103). Runs on its
 * own schedule against its own connection, entirely decoupled from
 * the live app's request/response cycle.
 *
 * DEVIATION FROM RULE 40.5's ILLUSTRATIVE FILENAME: the rule names
 * this file "scripts/runBackup.js" as a stack-generic example, but
 * this project is a TypeScript Next.js app (Rule 31), so the concrete
 * file is scripts/runBackup.ts, executed via `tsx` (added as a
 * devDependency in this task) so it can import the existing typed
 * services/prisma.ts, services/r2.ts, and services/googleDrive.ts
 * directly instead of duplicating their logic in plain JS. Flagged
 * here rather than silently renamed, per the no-silent-deviation
 * convention already used elsewhere in this repo's task files.
 */
import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createGzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import os from "node:os";

import { prisma } from "../services/prisma";
import { uploadToR2 } from "../services/r2";
import { uploadToDrive } from "../services/googleDrive";

const execFileAsync = promisify(execFile);

/**
 * dumpAndCompress
 * Runs pg_dump against DIRECT_URL — the Supabase Session Pooler
 * connection already defined in prisma.config.mjs for the CLI.
 * pg_dump needs prepared-statement support the transaction pooler
 * (DATABASE_URL, used by services/prisma.ts for normal app queries)
 * doesn't reliably provide — same reasoning as the CLI's own
 * DIRECT_URL requirement. Writes the raw dump to a temp file, then
 * gzips it into a second temp file and removes the raw one.
 */
async function dumpAndCompress(): Promise<string> {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    throw new Error("DIRECT_URL is not set — required for pg_dump.");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rawDumpPath = path.join(os.tmpdir(), `backup-${timestamp}.sql`);
  const gzipPath = `${rawDumpPath}.gz`;

  // pg_dump reads the connection string directly — no Prisma involved
  // here. Prisma is only used below for the BackupLog row itself.
  await execFileAsync("pg_dump", [directUrl, "-f", rawDumpPath, "--no-owner", "--no-privileges"]);

  await pipeline(createReadStream(rawDumpPath), createGzip(), createWriteStream(gzipPath));

  // Raw uncompressed dump is no longer needed once gzipped.
  await unlink(rawDumpPath);

  return gzipPath;
}

/**
 * runBackup
 * Orchestrates one full run: create the "running" BackupLog row,
 * dump + compress the database, upload independently to R2 and
 * Google Drive (one destination failing never blocks the other),
 * then finalize the row with the combined result.
 */
async function runBackup(): Promise<void> {
  const log = await prisma.backupLog.create({ data: { status: "running" } });

  let gzipPath: string | null = null;
  const failures: string[] = [];
  let r2Key: string | undefined;
  let r2Url: string | undefined;
  let driveFileId: string | undefined;
  let driveViewLink: string | undefined;
  let fileSizeBytes: number | undefined;

  try {
    gzipPath = await dumpAndCompress();
    const buffer = await readFile(gzipPath);
    fileSizeBytes = buffer.byteLength;
    const fileName = path.basename(gzipPath);

    // Upload to R2 — a failure here must never block the Drive attempt below.
    try {
      r2Key = `database-backups/${fileName}`;
      r2Url = await uploadToR2(r2Key, buffer, "application/gzip");
    } catch (r2Error) {
      failures.push(`R2: ${(r2Error as Error).message}`);
    }

    // Upload to Google Drive — independent of the R2 attempt above.
    try {
      const driveResult = await uploadToDrive(fileName, buffer, "application/gzip");
      driveFileId = driveResult.fileId;
      driveViewLink = driveResult.viewLink;
    } catch (driveError) {
      failures.push(`Drive: ${(driveError as Error).message}`);
    }
  } catch (dumpError) {
    // pg_dump or compression itself failed — both destinations are moot.
    failures.push(`Dump: ${(dumpError as Error).message}`);
  } finally {
    if (gzipPath) {
      await unlink(gzipPath).catch(() => {});
    }
  }

  // status is "failed" only if EVERY destination failed (Rule 40.4/40.5) —
  // a partial success (e.g. R2 ok, Drive failed) still records as "success"
  // with the failure noted in errorMessage.
  const bothDestinationsFailed = !r2Url && !driveViewLink;
  const status = bothDestinationsFailed ? "failed" : "success";

  await prisma.backupLog.update({
    where: { id: log.id },
    data: {
      status,
      fileSizeBytes,
      r2Key,
      r2Url,
      driveFileId,
      driveViewLink,
      errorMessage: failures.length > 0 ? failures.join(" | ") : null,
      completedAt: new Date(),
    },
  });

  console.log(`[runBackup] Finished with status: ${status}`);
  if (failures.length > 0) {
    console.error(`[runBackup] Failures: ${failures.join(" | ")}`);
  }

  // Exit non-zero only on full failure so CI marks the run correctly.
  process.exit(bothDestinationsFailed ? 1 : 0);
}

runBackup().catch((error) => {
  console.error("[runBackup] Unexpected top-level failure:", error);
  process.exit(1);
});
