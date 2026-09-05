/**
 * FILE: services/geoip.ts
 * PURPOSE:
 * City-level IP geolocation using a self-hosted MaxMind GeoLite2-City
 * database (Rule 38.5) — no external API calls, no third-party
 * tracking service. The .mmdb file is NOT committed to the repo (it's
 * a binary data file with its own license terms); download it
 * manually from maxmind.com and place it at
 * services/geoip/GeoLite2-City.mmdb before this will return real
 * results.
 *
 * Privacy rule (non-negotiable, Rule 38.5): latitude/longitude are
 * always rounded to 2 decimals before being returned — that's
 * city-level accuracy (~1-25km radius), never a precise address. The
 * raw IP address itself is never stored anywhere by this function.
 *
 * Fails safe: if the .mmdb file is missing or the lookup throws (e.g.
 * private/local IP, malformed IP), every field comes back null rather
 * than throwing — geolocation is a nice-to-have for anomaly
 * detection, never a reason to break login.
 */
import path from "path";
import fs from "fs";

interface GeoLookupResult {
  geoCountry: string | null;
  geoCity: string | null;
  geoLatitude: number | null;
  geoLongitude: number | null;
  geoAccuracy: number | null;
}

const EMPTY_RESULT: GeoLookupResult = {
  geoCountry: null,
  geoCity: null,
  geoLatitude: null,
  geoLongitude: null,
  geoAccuracy: null,
};

const DB_PATH = path.join(process.cwd(), "services/geoip/GeoLite2-City.mmdb");

// Lazily loaded so a missing .mmdb file (common until it's manually
// downloaded) doesn't crash the whole app at import time — only this
// module's functionality degrades to "no geo data".
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedReader: any = null;
let attemptedLoad = false;

async function getReader() {
  if (cachedReader) return cachedReader;
  if (attemptedLoad) return null;
  attemptedLoad = true;

  try {
    if (!fs.existsSync(DB_PATH)) {
      console.warn(
        "[geoip] GeoLite2-City.mmdb not found at services/geoip/ — geolocation will be skipped. Download it from maxmind.com."
      );
      return null;
    }

    // Dynamic import so the package is optional at build time for
    // anyone who hasn't run `npm install` for it yet.
    const { Reader } = await import("@maxmind/geoip2-node");
    cachedReader = Reader.openBuffer(fs.readFileSync(DB_PATH));
    return cachedReader;
  } catch (error) {
    console.error("[geoip] Failed to load GeoLite2 database:", (error as Error).message);
    return null;
  }
}

/**
 * getGeolocationFromIP
 * Looks up city/country + rounded lat/long for the given IP. Never
 * throws — returns EMPTY_RESULT on any failure (missing DB, private
 * IP, malformed input) so callers can spread this straight into a
 * Prisma `data` object without extra null-checking.
 */
export async function getGeolocationFromIP(ipAddress: string | null): Promise<GeoLookupResult> {
  if (!ipAddress) return EMPTY_RESULT;

  try {
    const reader = await getReader();
    if (!reader) return EMPTY_RESULT;

    const response = reader.city(ipAddress);

    return {
      geoCountry: response.country?.isoCode ?? null,
      geoCity: response.city?.names?.en ?? null,
      // Round to 2 decimals — city-level accuracy only, never precise (Rule 38.5)
      geoLatitude:
        response.location?.latitude != null
          ? Math.round(response.location.latitude * 100) / 100
          : null,
      geoLongitude:
        response.location?.longitude != null
          ? Math.round(response.location.longitude * 100) / 100
          : null,
      geoAccuracy: response.location?.accuracyRadius ?? null,
    };
  } catch (error) {
    // Common and expected for private/local IPs during local dev —
    // log at debug level rather than error to avoid noise.
    console.warn("[geoip] Lookup failed for IP (likely private/local):", (error as Error).message);
    return EMPTY_RESULT;
  }
}
