/**
 * FILE: lib/adminAccountStatus.ts
 * PURPOSE:
 * Computes the tri-state status shown on the Admin Management list
 * and detail pages (super_admin_account_specification.md Section
 * 3.2.1's "Active / Inactive / Locked" indicators) for task-94.
 *
 * GROUNDING NOTE (Rule 0D): Section 5.3 describes an intended lockout
 * ("after 5 failures: account locked for 1 hour, auto-recovery") but
 * this app has no stored lockedUntil/failedAttempts field anywhere in
 * prisma/schema.prisma, and app/api/auth/login/route.ts does not
 * currently block a login once 5 failures are reached — Rule 32.1's
 * IP-based rate limiter is the only thing that actually stops repeat
 * attempts today. "Locked" here is therefore a DISPLAY-ONLY signal,
 * derived from existing SecurityLog rows (never a real login block),
 * so the list/detail pages can at least surface the pattern the spec
 * describes. Enforcing the block itself is a separate, out-of-scope
 * gap in app/api/auth/login/route.ts — flagged here, not silently
 * fixed as part of this read-only task.
 *
 * "Inactive" reads Supabase Auth's banned_until — same convention
 * task-84/86 already use for buyers (a far-future ban_duration means
 * "deactivated until a super-admin reverses it"), so task-95's future
 * deactivate/reactivate action needs no new field either.
 */
import { prisma } from "@/services/prisma";

export type AdminAccountStatus = "active" | "inactive" | "locked";

const LOCKOUT_FAILURE_THRESHOLD = 5;
const LOCKOUT_WINDOW_MINUTES = 60;

/**
 * getAdminAccountStatus
 * @param email        - the admin's email (SecurityLog.actor for their login attempts)
 * @param isActiveBan  - false when Supabase's banned_until is in the future
 */
export async function getAdminAccountStatus(
  email: string | null,
  isActiveBan: boolean
): Promise<AdminAccountStatus> {
  if (!isActiveBan) return "inactive";
  if (!email) return "active";

  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
  const recentFailures = await prisma.securityLog.count({
    where: { eventType: "login_failed", actor: email, createdAt: { gte: windowStart } },
  });

  return recentFailures >= LOCKOUT_FAILURE_THRESHOLD ? "locked" : "active";
}

/**
 * getAdminAccountStatusBatch
 * Same rule, applied to a page of admins in one grouped query instead
 * of one COUNT per row — same batching discipline as task-84's list
 * route uses for order aggregates and last logins.
 */
export async function getAdminAccountStatusBatch(
  admins: { email: string | null; isActiveBan: boolean }[]
): Promise<Map<string, AdminAccountStatus>> {
  const statusByEmail = new Map<string, AdminAccountStatus>();
  const emailsToCheck = admins
    .filter((admin) => admin.isActiveBan && admin.email)
    .map((admin) => admin.email as string);

  if (emailsToCheck.length) {
    const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
    const grouped = await prisma.securityLog.groupBy({
      by: ["actor"],
      where: { eventType: "login_failed", actor: { in: emailsToCheck }, createdAt: { gte: windowStart } },
      _count: { _all: true },
    });
    for (const row of grouped) {
      if (row.actor && row._count._all >= LOCKOUT_FAILURE_THRESHOLD) {
        statusByEmail.set(row.actor, "locked");
      }
    }
  }

  for (const admin of admins) {
    if (!admin.email) continue;
    if (!admin.isActiveBan) {
      statusByEmail.set(admin.email, "inactive");
    } else if (!statusByEmail.has(admin.email)) {
      statusByEmail.set(admin.email, "active");
    }
  }

  return statusByEmail;
}
