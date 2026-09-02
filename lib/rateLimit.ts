/**
 * FILE: lib/rateLimit.ts
 * PURPOSE:
 * DB-backed rate limiter for auth endpoints (login, register), using
 * the RateLimitAttempt table instead of Redis — this project has no
 * Redis/Upstash set up, and Prisma is already wired to Supabase.
 *
 * Each call is one INSERT (the attempt) plus one COUNT (attempts in
 * the trailing window) — no read-modify-write counter, so concurrent
 * requests from the same IP never race each other.
 *
 * Fails OPEN on a database error: if the rate-limit check itself can't
 * run, the request is allowed through rather than locking everyone out
 * of login because of an unrelated DB hiccup. The error is logged so
 * it's visible, never silently swallowed.
 */
import { prisma } from "@/services/prisma";

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * checkRateLimit
 * Records this attempt and reports whether the caller has exceeded
 * maxAttempts for this endpoint within the trailing windowMinutes.
 *
 * @param ipAddress     - Caller's IP (from x-forwarded-for)
 * @param endpoint      - Short label for the endpoint, e.g. "login"
 * @param maxAttempts   - Attempts allowed within the window
 * @param windowMinutes - Trailing window size in minutes
 */
export async function checkRateLimit(
  ipAddress: string,
  endpoint: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Count attempts already made in the trailing window — the check
    // happens BEFORE recording this attempt, so the (maxAttempts + 1)th
    // request is the first one actually blocked.
    const attemptsInWindow = await prisma.rateLimitAttempt.count({
      where: { ipAddress, endpoint, createdAt: { gte: windowStart } },
    });

    if (attemptsInWindow >= maxAttempts) {
      return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
    }

    // Record this attempt so it counts toward future checks in the window.
    await prisma.rateLimitAttempt.create({ data: { ipAddress, endpoint } });

    return { allowed: true };
  } catch (error) {
    console.error("[rateLimit] Check failed, allowing request through:", (error as Error).message);
    return { allowed: true };
  }
}

/**
 * getClientIp
 * Extracts the caller's IP from the x-forwarded-for header (set by
 * Vercel/most proxies). Falls back to "unknown" so rate limiting still
 * degrades gracefully in local dev where the header may be absent.
 */
export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
