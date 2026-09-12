/**
 * FILE: lib/totpSetup.ts
 * PURPOSE:
 * Read-only lookup used by middleware.ts to enforce the mandatory
 * TOTP enrollment gate for admin/superAdmin accounts
 * (super_admin_account_specification.md Section 9.1: "Password alone
 * is not enough for the highest-privilege account"). Task-47, part 6
 * of 6.
 *
 * Fails OPEN on a DB error — same convention as lib/recoverySetup.ts's
 * isRecoverySetupComplete() and lib/gatekeeper.ts's checkDeviceBan().
 * A TOTP-lookup outage should never lock every admin out of their own
 * dashboard; the downside (an admin temporarily skipping the gate) is
 * far smaller than the downside of the whole admin area going down
 * alongside the DB.
 */
import { prisma } from "@/services/prisma";

/**
 * isTotpEnrolled
 * Returns true once the admin/superAdmin's AdminTotpCredential row has
 * enabled = true (flipped by POST /api/auth/totp/enroll/verify once
 * the 6-digit code is confirmed server-side). A missing row is the
 * expected state for an account that hasn't started enrollment yet —
 * that counts as NOT enrolled, same as a row that exists but is still
 * disabled. Only a DB error itself fails open (see file header above).
 */
export async function isTotpEnrolled(userId: string | null): Promise<boolean> {
  if (!userId) return true; // No session at all — not this gate's job to redirect

  try {
    const credential = await prisma.adminTotpCredential.findFirst({
      where: { userId },
      select: { enabled: true },
    });

    // No row yet = account hasn't started enrollment = not enrolled.
    // A row that exists but is still disabled = mid-setup = not enrolled.
    return credential?.enabled ?? false;
  } catch (error) {
    console.error("[totpSetup] Enrollment check failed, failing open:", (error as Error).message);
    return true;
  }
}
