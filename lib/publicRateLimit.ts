/**
 * FILE: lib/publicRateLimit.ts
 * PURPOSE:
 * Cheap, in-memory rate limiter for high-traffic PUBLIC read endpoints
 * (e.g. the storefront product grid/detail routes). Closes the
 * docs/openFindings.md [2026-09-20] gap: lib/rateLimit.ts (Rule 32.1's
 * DB-backed limiter) writes one RateLimitAttempt row per call, which is
 * fine for low-volume auth endpoints but too expensive to put on a
 * browse-heavy GET that fires on every page view.
 *
 * TRADE-OFF (documented, accepted):
 * State lives in a plain in-memory Map, not the database. On a
 * serverless platform (Vercel) this means:
 *   - Counts are per-instance, not global — a caller hitting two
 *     different warm instances gets two independent budgets.
 *   - A cold start / instance recycle resets that instance's counts.
 * This is the "cheaper edge/in-memory limit for public reads" option
 * the finding proposed, deliberately traded for zero added DB load on
 * public GETs. It still meaningfully slows down a single-instance
 * scraper/bot hammering one route — it is not meant to be as strict
 * as the DB-backed limiter used for login/register/password-reset.
 *
 * Never use this for auth or any security-sensitive endpoint — those
 * must keep using checkRateLimit() from lib/rateLimit.ts, which is
 * consistent across instances because it reads the database.
 */

interface PublicRateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

// One entry per "endpoint:ip" key -> sorted list of request timestamps
// (ms) still inside the trailing window. Pruned on every check so the
// map never holds more than each caller's live window.
const requestLog = new Map<string, number[]>();

// Hard ceiling on tracked keys so a distributed-IP flood can't grow
// this map without bound between prunes. Oldest keys are dropped first
// when the ceiling is hit — a rare, best-effort safety valve, not the
// primary defense.
const MAX_TRACKED_KEYS = 5000;

/**
 * checkPublicRateLimit
 * Reports whether this caller has exceeded maxAttempts for this
 * endpoint within the trailing windowMinutes — tracked in memory only,
 * no database write. Safe to call on every request of a public,
 * high-traffic GET route.
 *
 * @param ipAddress     - Caller's IP (from getClientIp)
 * @param endpoint      - Short label for the endpoint, e.g. "shop-products"
 * @param maxAttempts   - Requests allowed within the window (Rule 32.1
 *                        default for general API: 100)
 * @param windowMinutes - Trailing window size in minutes (Rule 32.1
 *                        default: 15)
 */
export function checkPublicRateLimit(
  ipAddress: string,
  endpoint: string,
  maxAttempts: number,
  windowMinutes: number
): PublicRateLimitResult {
  const key = `${endpoint}:${ipAddress}`;
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = now - windowMs;

  // Drop the oldest key when the map is at capacity — protects memory
  // under a distributed-IP flood without needing a timer/cron.
  if (!requestLog.has(key) && requestLog.size >= MAX_TRACKED_KEYS) {
    const oldestKey = requestLog.keys().next().value;
    if (oldestKey !== undefined) requestLog.delete(oldestKey);
  }

  // Keep only timestamps still inside the trailing window.
  const timestamps = (requestLog.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  if (timestamps.length >= maxAttempts) {
    requestLog.set(key, timestamps);
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return { allowed: true };
}
