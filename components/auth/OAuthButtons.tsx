/**
 * FILE: components/auth/OAuthButtons.tsx
 * ROLE: Auth — rendered at the bottom of SignInForm and RegisterForm on
 * /auth/login (task-56c). Buyers only; staff accounts never use OAuth.
 *
 * PURPOSE:
 * Shows an "or" divider and two buttons, "Continue with Google" and
 * "Continue with Facebook". The same two buttons appear on both tabs because
 * OAuth does not tell a new buyer from a returning one — the server decides
 * that in /api/auth/oauth/callback (task-56b).
 *
 * DATA FLOW:
 * 1. A click calls startOAuthSignIn(provider) from useOAuthSignIn.
 * 2. The hook sends the browser to /api/auth/oauth/start?provider=<name>.
 * 3. While redirecting, both buttons are disabled and the clicked one shows
 *    a spinner, so a double click cannot start two sign-ins.
 *
 * The buttons are type="button" on purpose: they sit inside the form element
 * of each tab and must never submit it. When SignInForm swaps to the TOTP
 * step it returns different markup, so these buttons disappear there.
 */
"use client";

import { Loader2 } from "lucide-react";
import { useOAuthSignIn, type OAuthProviderName } from "@/lib/hooks/useOAuthSignIn";

/** Google's "G" mark in the brand colours. Decorative — the label names the provider. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

/** Facebook's "f" mark in white, so it reads on the translucent glass card. */
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

const providerButtons: { provider: OAuthProviderName; label: string }[] = [
  { provider: "google", label: "Continue with Google" },
  { provider: "facebook", label: "Continue with Facebook" },
];

export default function OAuthButtons() {
  const { redirectingProvider, startOAuthSignIn } = useOAuthSignIn();
  const isRedirecting = redirectingProvider !== null;

  return (
    <div className="authOAuthSection">
      <div className="authOAuthDivider" role="separator">
        <span>or</span>
      </div>

      <div className="authOAuthButtons">
        {providerButtons.map(({ provider, label }) => (
          <button
            key={provider}
            type="button"
            className="authOAuthButton"
            disabled={isRedirecting}
            onClick={() => startOAuthSignIn(provider)}
          >
            {redirectingProvider === provider ? (
              <Loader2 size={18} className="authSpinner" />
            ) : provider === "google" ? (
              <GoogleIcon />
            ) : (
              <FacebookIcon />
            )}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
