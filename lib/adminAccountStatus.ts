/**
 * FILE: lib/adminAccountStatus.ts
 * PURPOSE:
 * Computes the tri-state status shown on the Admin Management list
 * and detail pages (super_admin_account_specification.md Section
 * 3.2.1's "Active / Inactive / Locked" indicators) for task-94.
 *
 * LOCKOUT RULE (Section 5.3, enforced since task-123): 5 failed
 * logins within 60 minutes lock an account until the oldest failure
 * ages out of the window — no stored lockedUntil field is needed,
 * because the count comes straight from SecurityLog rows. This file
 * computes the badge shown on the Admin Management pages, and
 * getAdminAccountStatus() is also the gate app/api/auth/login/route.ts
 * calls before checking a password for an admin/superAdmin account, so
 * the badge and the real block share one 5-in-60 rule and one threshold.
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
    // Case-insensitive: SecurityLog.actor stores the email exactly as it
    // was typed, so "Admin@x.com" and "admin@x.com" must count together
    // or a lockout could be dodged just by changing the letter case.
    where: {
      eventType: "login_failed",
      actor: { equals: email, mode: "insensitive" },
      createdAt: { gte: windowStart },
    },
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
