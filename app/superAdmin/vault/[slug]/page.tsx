/**
 * FILE: app/superAdmin/vault/[slug]/page.tsx
 * ROLE: Super-Admin only — protected by middleware.ts's Vault Slug
 * Validation branch (task-31), which already confirmed by the time
 * this renders: the session is active/unexpired, owned by the
 * signed-in user, and role-matched. This page does a second,
 * independent lookup (defense in depth, Server Component data
 * fetching per Rule 31.1/31.2) rather than trusting middleware alone
 * to have passed the right data down.
 *
 * PURPOSE:
 * Renders Section 6.1 of vault_specification.md: the super-admin's
 * 36-component session slug (12 words + 12 alphanumeric + 12
 * alphaspecial) read-only, plus the emergency-credentials generation
 * flow. Section 3 (Emergency Actions / Gatekeeper) is explicitly out
 * of scope for this task (task-33) — shown as a stub, not omitted
 * silently, per Rule 17.6.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { validateSlugActive } from "@/lib/vaultHelpers";
import VaultPage from "@/components/vault/VaultPage";
import "../../../styles/vault.css";

export const metadata: Metadata = {
  title: "Security vault | Matthew Studio",
  description: "Session slug and emergency backup credentials.",
};

interface SuperAdminVaultSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SuperAdminVaultSlugPage({ params }: SuperAdminVaultSlugPageProps) {
  const { slug: sessionId } = await params;
  const session = await validateSlugActive(sessionId);

  // Session expired/invalid between middleware's check and this render
  // (e.g. sign-out from another tab) — 404 rather than rendering a
  // vault page with no data. middleware.ts already redirects the
  // normal expired-session path to /auth/login; this covers the race.
  if (!session || session.role !== "superAdmin") {
    notFound();
  }

  const slugData = session.slug as { words: string[]; alphanumeric: string; alphaspecial: string };

  return (
    <VaultPage
      pageVariant="superAdmin"
      sessionRole="superAdmin"
      sessionId={session.id}
      slugComponents={[
        { label: "Words (12)", value: slugData.words.join(" ") },
        { label: "Alphanumeric (12)", value: slugData.alphanumeric },
        { label: "Alphaspecial (12)", value: slugData.alphaspecial },
      ]}
      generatedAt={session.loginAt.toISOString()}
      expiresAt={session.expiresAt.toISOString()}
    />
  );
}
