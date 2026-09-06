/**
 * FILE: app/admin/vault/[slug]/page.tsx
 * ROLE: Admin (and Super-Admin, per Section 12.3 cross-role access) —
 * protected by middleware.ts's Vault Slug Validation branch (task-31).
 *
 * PURPOSE:
 * Renders Section 6.2 of vault_specification.md: the admin's
 * 21-component session slug (7 alphanumeric + 7 alphaspecial + 7
 * words), simplified header versus the super-admin page, same
 * emergency-credentials generation flow and Emergency Actions stub.
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

interface AdminVaultSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminVaultSlugPage({ params }: AdminVaultSlugPageProps) {
  const { slug: sessionId } = await params;
  const session = await validateSlugActive(sessionId);

  // A super-admin's session is valid here too (Section 12.3), so this
  // only rejects a genuinely missing/expired session or a stray buyer
  // role — never an otherwise-valid superAdmin session, matching
  // middleware.ts's own role-match branch.
  if (!session || (session.role !== "admin" && session.role !== "superAdmin")) {
    notFound();
  }

  const slugData = session.slug as { alphanumeric: string; alphaspecial: string; words: string[] };

  return (
    <VaultPage
      pageVariant="admin"
      sessionRole={session.role as "admin" | "superAdmin"}
      sessionId={session.id}
      slugComponents={[
        { label: "Alphanumeric (7)", value: slugData.alphanumeric },
        { label: "Alphaspecial (7)", value: slugData.alphaspecial },
        { label: "Words (7)", value: slugData.words.join(" ") },
      ]}
      generatedAt={session.loginAt.toISOString()}
      expiresAt={session.expiresAt.toISOString()}
    />
  );
}
