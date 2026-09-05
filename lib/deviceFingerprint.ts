/**
 * FILE: lib/deviceFingerprint.ts
 * PURPOSE:
 * Generates a stable SHA-256 device fingerprint from request headers
 * only (user-agent, accept-language, accept-encoding) — deliberately
 * narrower than a full client-info fingerprint (Rule 38.4) because
 * this must run inside middleware.ts, before any client JS executes
 * (gatekeeper_specification.md). The same function is reused by
 * lib/securityLog.ts so a login's SecurityLog row and the Gatekeeper
 * check in middleware.ts always compute the identical hash for the
 * same request.
 */
import crypto from "crypto";

/**
 * generateDeviceFingerprint
 * Hashes user-agent + accept-language + accept-encoding into one
 * SHA-256 hex string. Missing headers just fall out of the joined
 * string rather than breaking the hash — a fingerprint is still
 * produced even for a bare-bones request.
 */
export function generateDeviceFingerprint(headers: Headers): string {
  const components = [
    headers.get("user-agent")?.toLowerCase().trim(),
    headers.get("accept-language"),
    headers.get("accept-encoding"),
  ]
    .filter(Boolean)
    .join("|");

  return crypto.createHash("sha256").update(components).digest("hex");
}
