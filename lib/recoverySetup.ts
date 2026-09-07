/**
 * FILE: lib/recoverySetup.ts
 * PURPOSE:
 * Read-only lookup used by middleware.ts to enforce the mandatory
 * post-registration recovery setup gate (buyer_password_recovery_
 * specification.md Section 2: "no way to reach /buyer/dashboard
 * without completing it"). Task-41.
 *
 * Fails OPEN on a DB error — same convention as lib/gatekeeper.ts's
 * checkDeviceBan(). A recovery-setup outage should never lock every
 * buyer out of their own dashboard; the downside (a buyer temporarily
 * skipping the gate) is far smaller than the downside of the whole
 * buyer area going down alongside the DB.
 */
import { prisma } from "@/services/prisma";

/**
 * isRecoverySetupComplete
 * Returns true once the buyer's BuyerRecovery row has
 * recoverySetupComplete = true (flipped by
 * /api/auth/recovery-setup/security-question once all 3 steps are
 * confirmed server-side). A missing row is the expected state for a
 * brand-new buyer who hasn't started setup yet — that counts as NOT
 * complete, same as a row that exists but is still false. Only a DB
 * error itself fails open (see class comment above).
 */
export async function isRecoverySetupComplete(userId: string | null): Promise<boolean> {
  if (!userId) return true; // No buyer session at all — not this gate's job to redirect

  try {
    const recovery = await prisma.buyerRecovery.findUnique({
      where: { userId },
      select: { recoverySetupComplete: true },
    });

    // No row yet = brand-new buyer who hasn't started setup = not complete.
    // A row that exists but is still false = mid-setup = not complete.
    return recovery?.recoverySetupComplete ?? false;
  } catch (error) {
    console.error("[recoverySetup] Completeness check failed, failing open:", (error as Error).message);
    return true;
  }
}
