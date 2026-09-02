/**
 * FILE: lib/csrf.ts
 * PURPOSE:
 * Double-submit cookie CSRF protection (Rule 32.2) for every
 * state-changing auth endpoint (login, register, forgot-password,
 * reset-password logging, logout). middleware.ts issues a random
 * token in a non-HttpOnly cookie — client JS must be able to read it
 * to echo it back, so SameSite=strict + the short-lived random value
 * is the actual protection here, not secrecy from JS. Client forms
 * call getCsrfHeader() to attach it as a request header; route
 * handlers call isValidCsrfRequest() to confirm the header matches
 * the cookie before doing anything else.
 *
 * Isomorphic on purpose — no Node-only "crypto" import (middleware
 * runs on the Edge runtime, which doesn't have it) and no browser-only
 * API at module scope, so this file is safe to import from
 * middleware.ts, route handlers, and "use client" components alike.
 */

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * generateCsrfToken
 * 32 bytes of randomness, hex-encoded. Uses the Web Crypto API
 * (globalThis.crypto) rather than Node's "crypto" module so this
 * works unmodified in the Edge middleware runtime.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * csrfTokensMatch
 * Constant-time string comparison so a mismatched token can't be
 * narrowed down character-by-character via response timing.
 */
function csrfTokensMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * getCookieValue
 * Parses a single cookie's value out of a raw "cookie" request
 * header. Route handlers in this project are typed as plain Request
 * (not NextRequest), so this avoids pulling in next/server's cookie
 * parsing just for this one check.
 */
function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const found = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

/**
 * isValidCsrfRequest
 * Server-side check for route handlers: the token in the
 * x-csrf-token header must match the token in the csrf_token cookie.
 * A cross-origin form or script can make the browser attach the
 * cookie automatically, but same-origin policy blocks it from reading
 * that cookie's value to also set the matching header — so a mismatch
 * (or a missing header entirely) means the request didn't originate
 * from this app's own pages.
 */
export function isValidCsrfRequest(request: Request): boolean {
  const cookieToken = getCookieValue(request, CSRF_COOKIE_NAME);
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  return csrfTokensMatch(cookieToken, headerToken);
}

/**
 * getCsrfHeader
 * Client-side helper: reads the csrf_token cookie via document.cookie
 * and returns it as a ready-to-spread fetch headers object. Returns
 * {} during SSR or if the cookie isn't set yet, so it's safe to call
 * unconditionally from "use client" form components.
 */
export function getCsrfHeader(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`));
  const token = found ? decodeURIComponent(found.slice(CSRF_COOKIE_NAME.length + 1)) : "";
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}
