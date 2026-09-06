/**
 * FILE: components/vault/VaultPage.tsx
 * ROLE: Rendered by app/superAdmin/vault/[slug]/page.tsx and
 * app/admin/vault/[slug]/page.tsx — never routed to directly.
 *
 * PURPOSE:
 * Implements vault_specification.md Sections 6.1/6.2 (task-32 scope
 * only — Section 3/"Emergency Actions" is a stub here, built out in
 * task-33):
 *   Section 1 — read-only display of the current session slug, with
 *     per-component copy buttons.
 *   Section 2 — on-demand emergency credentials generation: calls
 *     POST /api/vault/credentials/generate, shows the plaintext once,
 *     then on explicit confirmation hashes it client-side
 *     (lib/clientHash.ts) and calls POST /api/vault/credentials/store
 *     so only the hash ever reaches the database (Section 8.2).
 *
 * DATA FLOW:
 * Slug data and timestamps are passed in as props — already fetched
 * server-side by the parent page (Rule 31.1: no client-side fetch for
 * data the Server Component already has). Only the credentials
 * generate/store round-trip is client-side, since it's user-triggered
 * and must never be pre-fetched or cached.
 */
"use client";

import { useState } from "react";
import { Copy, Check, ShieldAlert, KeyRound, Wrench } from "lucide-react";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import { getCsrfHeader } from "@/lib/csrf";
import { hashVaultCredentialsClient } from "@/lib/clientHash";

interface SlugComponent {
  label: string;
  value: string;
}

interface VaultPageProps {
  /** Which page template to render — controls header copy/warnings only. */
  pageVariant: "superAdmin" | "admin";
  /** The actual AdminSession role — what's sent to the credentials API, may differ from pageVariant for a super-admin viewing /admin/vault. */
  sessionRole: "superAdmin" | "admin";
  sessionId: string;
  slugComponents: SlugComponent[];
  generatedAt: string;
  expiresAt: string;
}

interface GeneratedCredentials {
  words: string[];
  alphanumeric: string;
  generatedAt: string;
  expiresAt: string;
}

/**
 * formatTimestamp
 * Renders an ISO timestamp using the browser's locale — this file is
 * "use client" specifically so this can run client-side and avoid a
 * server/client hydration mismatch on locale-dependent date formatting.
 */
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function VaultPage({
  pageVariant,
  sessionRole,
  sessionId,
  slugComponents,
  generatedAt,
  expiresAt,
}: VaultPageProps) {
  const { toasts, showToast, dismissToast } = useToast();
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);

  /**
   * copyToClipboard
   * Copies a single slug/credential component and flashes a brief
   * "Copied" state on that specific button — never a page-wide toast
   * for this one, since it's a low-stakes, frequent action.
   */
  async function copyToClipboard(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel((current) => (current === label ? null : current)), 1500);
    } catch {
      showToast("Couldn't copy to clipboard. Select and copy manually.", "error");
    }
  }

  /**
   * handleGenerateCredentials
   * Calls the generate route (task-30) and displays the plaintext
   * result. Nothing is persisted at this step — see Section 8.2's
   * header note on lib/vaultHelpers.ts.
   */
  async function handleGenerateCredentials() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/vault/credentials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ sessionId, role: sessionRole }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Couldn't generate credentials. Please try again.", "error");
        return;
      }

      setCredentials(result.data);
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * handleConfirmBackup
   * Hashes the currently displayed credentials client-side and sends
   * only the hashes to the store route (task-30), then clears the
   * plaintext from state so it's never left sitting in memory/DOM
   * longer than the user needs to copy it.
   */
  async function handleConfirmBackup() {
    if (!credentials) return;
    setIsConfirming(true);
    try {
      const { wordsHash, alphanumericHash } = await hashVaultCredentialsClient(
        credentials.words,
        credentials.alphanumeric
      );

      const response = await fetch("/api/vault/credentials/store", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ sessionId, wordsHash, alphanumericHash }),
      });
      const result = await response.json();

      if (!result.success) {
        showToast(result.message ?? "Couldn't record the backup. Please try again.", "error");
        return;
      }

      showToast("✓ Emergency credentials confirmed and logged.", "success");
      setCredentials(null);
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setIsConfirming(false);
    }
  }

  const isSuperAdminVariant = pageVariant === "superAdmin";

  return (
    <section className="vaultPage">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="vaultPageHeader">
        <span className="vaultPageEyebrow">Security vault</span>
        <h1 className="vaultPageTitle">Admin Session &amp; Backup Credentials</h1>
        <p className="vaultPageSubtitle">
          View your session slug and generate emergency backup credentials
        </p>
      </div>

      {/* Warning banner — fuller wording for super-admin per Section 6.1, simplified for admin per 6.2 */}
      <div className="vaultWarningBanner" role="note">
        <ShieldAlert size={18} className="vaultWarningIcon" />
        <div>
          <p className="vaultWarningTitle">Session slug</p>
          <p className="vaultWarningText">
            This slug is your session identifier. It changes every login and expires when you sign
            out.
            {isSuperAdminVariant && " Store it securely offline if needed for recovery purposes."}{" "}
            Never share it, never commit it to version control, never email it unencrypted.
          </p>
        </div>
      </div>

      <div className="vaultSessionInfo">
        <span className="vaultSessionInfoRow">
          <span className="vaultSessionInfoLabel">Status</span>
          <span className="vaultSessionInfoValue vaultSessionInfoValue--active">Active</span>
        </span>
        <span className="vaultSessionInfoRow">
          <span className="vaultSessionInfoLabel">Generated</span>
          <span className="vaultSessionInfoValue">{formatTimestamp(generatedAt)}</span>
        </span>
        <span className="vaultSessionInfoRow">
          <span className="vaultSessionInfoLabel">Expires</span>
          <span className="vaultSessionInfoValue">{formatTimestamp(expiresAt)}</span>
        </span>
        <span className="vaultSessionInfoRow">
          <span className="vaultSessionInfoLabel">Regenerate on next login</span>
          <span className="vaultSessionInfoValue">Yes</span>
        </span>
      </div>

      {/* Section 1 — current session slug, read-only */}
      <section aria-label="Current session slug" className="vaultPanel">
        <h2 className="vaultPanelTitle">Current Session Slug</h2>
        <div className="vaultSlugGrid">
          {slugComponents.map(({ label, value }) => (
            <div key={label} className="vaultSlugCard">
              <span className="vaultSlugLabel">{label}</span>
              <span className="vaultSlugValue">{value}</span>
              <button
                type="button"
                className="vaultCopyButton"
                onClick={() => copyToClipboard(label, value)}
                aria-label={`Copy ${label}`}
              >
                {copiedLabel === label ? <Check size={16} /> : <Copy size={16} />}
                {copiedLabel === label ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="vaultRegenerateButton" disabled title="Regenerates automatically on your next login">
          Regenerate slug
        </button>
      </section>

      {/* Section 2 — emergency credentials generation */}
      <section aria-label="Emergency backup credentials" className="vaultPanel">
        <h2 className="vaultPanelTitle">Generate Vault Credentials</h2>
        {!credentials ? (
          <>
            <p className="vaultPanelDescription">
              Generates one-time emergency access credentials. They exist only on this screen and
              are never stored — copy or screenshot them immediately.
            </p>
            <button
              type="button"
              className="vaultGenerateButton"
              onClick={handleGenerateCredentials}
              disabled={isGenerating}
            >
              <KeyRound size={18} />
              {isGenerating ? "Generating…" : "Generate Emergency Credentials"}
            </button>
          </>
        ) : (
          <div className="vaultCredentialsResult">
            <p className="vaultCredentialsWarning">
              ⚠️ Copy or screenshot immediately. These will not be shown again after you leave this
              page.
            </p>

            <div className="vaultSlugCard">
              <span className="vaultSlugLabel">Words (15)</span>
              <span className="vaultSlugValue">{credentials.words.join(" ")}</span>
              <button
                type="button"
                className="vaultCopyButton"
                onClick={() => copyToClipboard("Emergency words", credentials.words.join(" "))}
              >
                {copiedLabel === "Emergency words" ? <Check size={16} /> : <Copy size={16} />}
                {copiedLabel === "Emergency words" ? "Copied" : "Copy Words"}
              </button>
            </div>

            <div className="vaultSlugCard">
              <span className="vaultSlugLabel">Alphanumeric (15)</span>
              <span className="vaultSlugValue">{credentials.alphanumeric}</span>
              <button
                type="button"
                className="vaultCopyButton"
                onClick={() => copyToClipboard("Emergency alphanumeric", credentials.alphanumeric)}
              >
                {copiedLabel === "Emergency alphanumeric" ? <Check size={16} /> : <Copy size={16} />}
                {copiedLabel === "Emergency alphanumeric" ? "Copied" : "Copy Alphanumeric"}
              </button>
            </div>

            <div className="vaultCredentialsActions">
              <button
                type="button"
                className="vaultCredentialsCancel"
                onClick={() => setCredentials(null)}
                disabled={isConfirming}
              >
                Close
              </button>
              <button
                type="button"
                className="vaultCredentialsConfirm"
                onClick={handleConfirmBackup}
                disabled={isConfirming}
              >
                {isConfirming ? "Confirming…" : "I've backed these up"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section 3 — Emergency Actions stub. Full Gatekeeper panel is task-33's scope. */}
      <section aria-label="Emergency actions" className="vaultPanel">
        <h2 className="vaultPanelTitle">Emergency Actions</h2>
        <div className="vaultStub">
          <Wrench size={24} className="vaultStubIcon" />
          <p className="vaultStubText">
            Gatekeeper threat monitoring and emergency controls (backup now, wipe data, account
            access) are built in a later phase.
          </p>
        </div>
      </section>

      <div className="vaultFooter">
        <p className="vaultFooterTip">
          Emergency credentials are ephemeral. Generate and store them offline — never rely on the
          browser to keep them.
        </p>
      </div>
    </section>
  );
}
