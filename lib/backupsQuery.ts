/**
 * FILE: lib/backupsQuery.ts
 * ROLE: Shared by app/api/superadmin/backups/route.ts — never called
 * directly from a component.
 *
 * PURPOSE:
 * Single paginated, filterable query against BackupLog (Rule 40.6's
 * DataTable feed) for the /superAdmin/backups page (task-105).
 * Mirrors lib/accountActivityQuery.ts's and lib/securityLogsQuery.ts's
 * shape so every super-admin list page fetches the same way.
 *
 * Strictly a READ. Nothing in this file, or in the route that calls
 * it, ever triggers a backup — BackupLog rows are written only by
 * scripts/runBackup.ts (task-102), on its own schedule, never from
 * a request in the live app (Rule 40.1/40.6).
 */
import { prisma } from "@/services/prisma";

export interface ListBackupLogsParams {
  page: number;
  limit: number;
  status?: string; // exact match — "running" | "success" | "failed", or omitted for "All"
}

export async function listBackupLogs({ page, limit, status }: ListBackupLogsParams) {
  const where: { status?: string } = {};
  if (status) where.status = status;

  const [logs, totalCount] = await Promise.all([
    prisma.backupLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.backupLog.count({ where }),
  ]);

  return { logs, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)), page };
}
