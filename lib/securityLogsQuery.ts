/**
 * FILE: lib/securityLogsQuery.ts
 * ROLE: Shared by both /api/superadmin/security-logs and
 * /api/admin/security-logs — never called directly from a component.
 *
 * PURPOSE:
 * Completes task-45 (API half): a single paginated, filterable query
 * against SecurityLog (Rule 38.9's DataTable feed) that both Security
 * Logs pages read from. The super-admin route calls this with no
 * `actorEmail`, seeing every row platform-wide. The admin route
 * (admin_account_specification.md Section 3.6) always passes its own
 * email, so the WHERE clause is scoped server-side — never trust a
 * frontend filter alone for that restriction (Section 3.6's own
 * wording).
 *
 * DATA FLOW:
 * 1. Caller (either API route) resolves the calling account first and
 *    decides whether to pass actorEmail.
 * 2. listSecurityLogs() builds one `where` clause covering eventType,
 *    actor (optional self-scope), and a createdAt date range.
 * 3. Two queries run in parallel — the page of rows, and a total
 *    count for pagination — same shape as lib/gatekeeper.ts's
 *    listDeviceBans().
 */
import { prisma } from "@/services/prisma";

export interface ListSecurityLogsParams {
  page: number;
  limit: number;
  eventType?: string;
  actorEmail?: string; // when set, scopes results to this actor only (admin self-view)
  dateFrom?: Date;
  dateTo?: Date;
}

export async function listSecurityLogs({
  page,
  limit,
  eventType,
  actorEmail,
  dateFrom,
  dateTo,
}: ListSecurityLogsParams) {
  const where: {
    eventType?: string;
    actor?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (eventType) where.eventType = eventType;

  // Self-scope: admin routes always pass their own email here, so an
  // admin can never see another admin's or super-admin's events
  // (admin_account_specification.md Section 3.6's scope restriction).
  if (actorEmail) where.actor = actorEmail;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [logs, totalCount] = await Promise.all([
    prisma.securityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.securityLog.count({ where }),
  ]);

  return { logs, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)), page };
}
