/**
 * FILE: lib/oauthPkce.ts
 * ROLE: Server-side only — used by app/api/auth/oauth/start/route.ts and
 * app/api/auth/oauth/callback/route.ts (task-56b). Never import in a client file.
 *
 * PURPOSE:
 * Lets the SERVER run the whole Google/Facebook sign-in, so Supabase tokens
 * never reach browser JavaScript or localStorage (Rule 18.4). Supabase's PKCE
 * flow needs a one-time "code verifier" to survive between two requests: the
 * one that starts the sign-in and the one the provider sends the user back
 * to. A browser would keep it in localStorage; here it is kept in a short
 * HttpOnly cookie instead, through a tiny in-memory storage adapter.
 *
 * DATA FLOW:
 * 1. start route: createOAuthClient() -> signInWithOAuth() writes the verifier
 *    into the adapter -> getSnapshot() -> serializeSnapshot() -> cookie.
 * 2. callback route: parseSnapshot(cookie) -> createOAuthClient(snapshot) ->
 *    exchangeCodeForSession() finds the verifier in the adapter again.
 */
import { createClient } from "@supabase/supabase-js";

export const SUPPORTED_OAUTH_PROVIDERS = ["google", "facebook"] as const;
export type OAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

/** HttpOnly cookie holding the PKCE verifier, written by start and read by callback. */
export const OAUTH_PKCE_COOKIE = "oauth-pkce";

/** HttpOnly cookie remembering which provider this sign-in started with. */
export const OAUTH_PROVIDER_COOKIE = "oauth-provider";

/** Cookies are only sent to the OAuth routes, never to the rest of the site. */
export const OAUTH_COOKIE_PATH = "/api/auth/oauth";

/** A sign-in must finish within 10 minutes of starting. */
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

/** Only storage keys containing this text are ever kept or restored. */
const VERIFIER_KEY_MARKER = "code-verifier";
const MAX_SNAPSHOT_ENTRIES = 10;
const MAX_SNAPSHOT_CHARACTERS = 3000;

type StorageSnapshot = Record<string, string>;

/**
 * isSupportedOAuthProvider
 * True only for the providers decided on 2026-10-24 (Google, Facebook).
 * Anything else — including a made-up ?provider= value — is rejected.
 */
export function isSupportedOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (SUPPORTED_OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/**
 * createOAuthClient
 * Builds a one-request Supabase client that uses PKCE and keeps its storage
 * in memory, optionally pre-filled from a saved snapshot. Auto-refresh and
 * URL detection are off because this runs on the server for a single request.
 */
export function createOAuthClient(initial: StorageSnapshot = {}) {
  const entries = new Map<string, string>(Object.entries(initial));

  // The adapter Supabase calls to read, write and delete its own keys.
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };

  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      flowType: "pkce",
      storage,
      persistSession: true, // needed so the client keeps the session after the code exchange
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    client,
    /** Only the verifier entries, ready to be saved in the cookie. */
    getSnapshot: (): StorageSnapshot =>
      Object.fromEntries([...entries].filter(([key]) => key.includes(VERIFIER_KEY_MARKER))),
  };
}

/** serializeSnapshot — turns a snapshot into a cookie-safe string. */
export function serializeSnapshot(snapshot: StorageSnapshot): string {
  return Buffer.from(JSON.stringify(snapshot), "utf8").toString("base64url");
}

/**
 * parseSnapshot
 * Reads the cookie back. Returns null for anything that is not a small
 * object of verifier entries, so a tampered cookie can never plant other
 * keys (such as a fake session) into the client's storage.
 */
export function parseSnapshot(raw: string | undefined | null): StorageSnapshot | null {
  if (!raw || raw.length > MAX_SNAPSHOT_CHARACTERS) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.length === 0 || entries.length > MAX_SNAPSHOT_ENTRIES) return null;

    const snapshot: StorageSnapshot = {};
    for (const [key, value] of entries) {
      if (typeof value !== "string" || !key.includes(VERIFIER_KEY_MARKER)) return null;
      snapshot[key] = value;
    }
    return snapshot;
  } catch {
    return null;
  }
}
