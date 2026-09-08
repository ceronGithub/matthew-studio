/**
 * FILE: lib/accountActivityQuery.ts
 * ROLE: Shared by app/api/superadmin/account-activity/route.ts —
 * never called directly from a component.
 *
 * PURPOSE:
 * Completes task-46: a single paginated, filterable query against
 * AccountActivityLog (Rule 42.3's DataTable feed) that the Account
 * Activity page reads from. Mirrors lib/securityLogsQuery.ts's shape
 * so every super-admin list page fetches the same way.
 *
 * DATA FLOW:
 * 1. The API route resolves the calling account and confirms
 *    role === "superAdmin" before calling either function below.
 * 2. listAccountActivity() builds one `where` clause covering
 *    accountId (exact match, from the Section 3.4 dropdown),
 *    action (contains-match — action stores a page path or a
 *    free-form action name, never a fixed enum, so exact match
 *    would miss the "page visit" filtering use case), and a
 *    createdAt date range.
 * 3. Two queries run in parallel — the page of rows, and a total
 *    count for pagination — same shape as listSecurityLogs().
 * 4. listDistinctAccountActors() feeds the account dropdown itself —
 *    there is no separate admin-accounts table to query (admin/
 *    super-admin identity lives in Supabase Auth), so the distinct
 *    accountId values already written to AccountActivityLog are the
 *    dropdown's option list.
 */
import { prisma } from "@/services/prisma";

export interface ListAccountActivityParams {
  page: number;
  limit: number;
  accountId?: string; // exact match — one option from the Section 3.4 dropdown, or omitted for "All"
  action?: string; // contains-match against a page path or a named action
  dateFrom?: Date;
  dateTo?: Date;
}

export async function listAccountActivity({
  page,
  limit,
  accountId,
  action,
  dateFrom,
  dateTo,
}: ListAccountActivityParams) {
  const where: {
    accountId?: string;
    action?: { contains: string; mode: "insensitive" };
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (accountId) where.accountId = accountId;
  if (action) where.action = { contains: action, mode: "insensitive" };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [logs, totalCount] = await Promise.all([
    prisma.accountActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accountActivityLog.count({ where }),
  ]);

  return { logs, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)), page };
}

/**
 * listDistinctAccountActors
 * Every distinct accountId (email) that has ever written an
 * AccountActivityLog row, newest-active first. Feeds the "Account"
 * dropdown filter (Section 3.4) — kept as a narrow, purpose-built
 * query rather than reusing listAccountActivity() with a huge limit.
 */
export async function listDistinctAccountActors(): Promise<string[]> {
  const rows = await prisma.accountActivityLog.findMany({
    distinct: ["accountId"],
    orderBy: { createdAt: "desc" },
    select: { accountId: true },
    take: 200, // reasonable ceiling — this is an admin/super-admin account count, never a public-user count
  });

  return rows.map((row: { accountId: string }) => row.accountId);
}
