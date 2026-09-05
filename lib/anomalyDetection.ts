/**
 * FILE: lib/anomalyDetection.ts
 * PURPOSE:
 * Runs after every successful login (Phase 2, Section 9.1). Compares
 * the current login's geolocation and device fingerprint against the
 * account's recent SecurityLog history to catch:
 *   1. Impossible travel — two logins too far apart to be the same
 *      person, given the time between them and a max plausible travel
 *      speed (commercial flight, ~900 km/h).
 *   2. A brand-new device fingerprint for an account with an
 *      established login history.
 *
 * Section 9.1 requires impossible-travel to BLOCK the session, not
 * just log it. This module logs a `location_anomaly` SecurityLog row
 * AND deactivates the AdminSession row passed in — the caller
 * (app/api/auth/login/route.ts) is responsible for rejecting the
 * login response when `blocked: true` comes back, so the user never
 * reaches their dashboard on a flagged login. A real second-channel
 * re-verification (e.g. email OTP) is not built in this phase — that
 * belongs with the Account Recovery Trio (Rule 48) infrastructure;
 * for now, a blocked session simply requires the account owner to
 * sign in again, which gives a super-admin visibility via the
 * Security Logs page to investigate before it happens again.
 */
import { prisma } from "@/services/prisma";
import { logSecurityEvent } from "@/lib/securityLog";

const MAX_TRAVEL_SPEED_KMH = 900; // commercial flight cruising speed
const MIN_LOGIN_HISTORY_FOR_DEVICE_CHECK = 3; // don't flag a brand-new account's first few logins

interface AnomalyCheckInput {
  accountId: string; // actor value used in SecurityLog (email)
  sessionId?: string | null; // AdminSession.id to deactivate if blocked
  request?: Request | null;
}

interface AnomalyCheckResult {
  blocked: boolean;
  reason?: string;
}

/**
 * calculateGreatCircleDistance
 * Haversine formula — distance in km between two lat/long points.
 */
function calculateGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const deltaLat = toRad(lat2 - lat1);
  const deltaLon = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

/**
 * detectAnomalies
 * Call this AFTER a login_success SecurityLog row has already been
 * written for the current attempt (so it's included when we fetch
 * "recent logins" — we skip the most recent one as "current" and
 * compare against the one before it).
 */
export async function detectAnomalies({
  accountId,
  sessionId = null,
  request = null,
}: AnomalyCheckInput): Promise<AnomalyCheckResult> {
  try {
    const recentLogins = await prisma.securityLog.findMany({
      where: { actor: accountId, eventType: "login_success" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Need at least the current login + one prior login to compare.
    if (recentLogins.length < 2) return { blocked: false };

    const [currentLogin, previousLogin] = recentLogins;

    // --- CHECK 1: Impossible travel ---
    if (
      currentLogin.geoLatitude != null &&
      currentLogin.geoLongitude != null &&
      previousLogin.geoLatitude != null &&
      previousLogin.geoLongitude != null
    ) {
      const distanceKm = calculateGreatCircleDistance(
        previousLogin.geoLatitude,
        previousLogin.geoLongitude,
        currentLogin.geoLatitude,
        currentLogin.geoLongitude
      );

      const hoursBetween =
        (new Date(currentLogin.createdAt).getTime() - new Date(previousLogin.createdAt).getTime()) /
        (1000 * 60 * 60);

      const minPlausibleHours = distanceKm / MAX_TRAVEL_SPEED_KMH;

      if (hoursBetween < minPlausibleHours && distanceKm > 50) {
        const reason = `Impossible travel: ${previousLogin.geoCity ?? "unknown"} → ${
          currentLogin.geoCity ?? "unknown"
        } in ${hoursBetween.toFixed(1)}h (${Math.round(distanceKm)}km apart)`;

        await logSecurityEvent({
          eventType: "location_anomaly",
          actor: accountId,
          request,
          details: reason,
        });

        // Block the session pending re-login (Section 9.1) — never
        // just log it silently.
        if (sessionId) {
          await prisma.adminSession.update({
            where: { id: sessionId },
            data: { isActive: false },
          });
        }

        return { blocked: true, reason };
      }
    }

    // --- CHECK 2: New device fingerprint ---
    if (recentLogins.length >= MIN_LOGIN_HISTORY_FOR_DEVICE_CHECK && currentLogin.deviceFingerprint) {
      const knownFingerprints = await prisma.securityLog.findMany({
        where: {
          actor: accountId,
          eventType: "login_success",
          deviceFingerprint: { not: null },
          id: { not: currentLogin.id },
        },
        select: { deviceFingerprint: true },
        distinct: ["deviceFingerprint"],
      });

      const isNewDevice = !knownFingerprints.some(
        (row) => row.deviceFingerprint === currentLogin.deviceFingerprint
      );

      if (isNewDevice) {
        await logSecurityEvent({
          eventType: "device_change",
          actor: accountId,
          request,
          details: `New device: ${currentLogin.browserName ?? "unknown browser"} on ${
            currentLogin.osName ?? "unknown OS"
          }`,
        });
      }
    }

    return { blocked: false };
  } catch (error) {
    // Anomaly detection is a fire-and-forget safety net — never let a
    // failure here block a legitimate login.
    console.error("[anomalyDetection] Check failed:", (error as Error).message);
    return { blocked: false };
  }
}
