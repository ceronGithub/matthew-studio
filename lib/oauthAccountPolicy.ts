/**
 * FILE: lib/oauthAccountPolicy.ts
 * ROLE: Server-side only — used by app/api/auth/oauth/callback/route.ts
 * (task-56b) right after Supabase has exchanged the OAuth code for a user.
 *
 * PURPOSE:
 * Decides what a Google or Facebook sign-in is allowed to do. Rules decided
 * 2026-10-24: buyers only (admin and super-admin keep password + TOTP), and an
 * email that already belongs to a password account is blocked, never linked.
 * This file only decides; it never touches the database, Supabase or cookies,
 * so the callback route stays thin and every outcome can be tested alone.
 *
 * DATA FLOW:
 * 1. The callback passes the provider's email, whether it is verified, the
 *    stored role, and the list of sign-in methods attached to the user.
 * 2. Checks run from most to least serious; the first one that matches wins.
 * 3. Returns one outcome. "allow_*" outcomes let the callback issue a session;
 *    "block_*" outcomes make it sign the user out and show a message.
 */

/** Everything the callback can be told to do with this sign-in. */
export type OAuthOutcome =
  | "allow_new_buyer"
  | "allow_existing_oauth_buyer"
  | "block_password_account"
  | "block_staff_account"
  | "block_no_email";

export interface OAuthPolicyInput {
  /** Email the provider returned. Null when the provider gave none. */
  email: string | null;
  /** True only when the provider says it has verified that email. */
  isEmailVerified: boolean;
  /** Role stored on the Supabase user (user_metadata.role). Null for a brand-new OAuth user. */
  role: string | null;
  /** Provider names attached to the user, e.g. ["email", "google"]. */
  identityProviders: string[];
}

/**
 * decideOAuthOutcome
 * Returns what the callback should do with this sign-in. First match wins,
 * in this order: no usable email, staff account, password account, then allow.
 */
export function decideOAuthOutcome(input: OAuthPolicyInput): OAuthOutcome {
  // No email, or one the provider has not verified: we cannot safely tell who
  // this is, and an unverified email could be used to take over someone else's
  // account. Facebook sometimes returns no email at all (phone-only accounts).
  const hasUsableEmail = Boolean(input.email) && input.isEmailVerified;
  if (!hasUsableEmail) return "block_no_email";

  // Admin and super-admin accounts never sign in through OAuth, so their
  // password + TOTP + Vault flow can never be bypassed. Any role that is not
  // "buyer" is treated the same way, in case a new role is added later.
  const isUnsetRole = input.role === null || input.role === "";
  if (!isUnsetRole && input.role !== "buyer") return "block_staff_account";

  // An "email" sign-in method means this address already has a password. We do
  // not link it silently (decision 2026-10-24); the buyer must sign in with
  // their password instead.
  if (input.identityProviders.includes("email")) return "block_password_account";

  // A buyer whose role is already set and who has no password is a returning
  // OAuth buyer. An unset role means this is their first OAuth sign-in, so the
  // callback creates the buyer account by setting the role.
  return isUnsetRole ? "allow_new_buyer" : "allow_existing_oauth_buyer";
}

/**
 * isBlockedOutcome
 * True for any "block_*" outcome, so the callback can branch once instead of
 * listing every blocked case.
 */
export function isBlockedOutcome(outcome: OAuthOutcome): boolean {
  return outcome.startsWith("block_");
}
