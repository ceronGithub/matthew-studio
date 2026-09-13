/**
 * FILE: lib/contentVersions.ts
 * PURPOSE:
 * task-114, Section 9.3 — shared version-history pruning logic used
 * by both app/api/superadmin/content/[sectionId]/route.ts's PUT
 * (publish) and .../revert/route.ts's POST (revert), since both
 * routes create a new ContentVersion snapshot and both must enforce
 * the same 5-row-per-section cap afterward.
 *
 * Kept out of either route.ts file because Next.js App Router route
 * files may only export the recognized HTTP-method handlers (GET,
 * POST, etc.) plus a small set of route config fields — any other
 * named export is a build error, so shared helpers always live here
 * instead.
 */
import { prisma } from "@/services/prisma";

export const MAX_VERSIONS_PER_SECTION = 5;

/**
 * pruneOldVersions
 * Deletes the oldest ContentVersion rows for a section beyond the
 * 5-row cap. Called after every snapshot write, so the table never
 * grows past 5 rows per section regardless of which route created
 * the newest snapshot.
 */
export async function pruneOldVersions(sectionId: string): Promise<void> {
  const staleVersions = await prisma.contentVersion.findMany({
    where: { sectionId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: MAX_VERSIONS_PER_SECTION,
  });
  if (staleVersions.length === 0) return;

  await prisma.contentVersion.deleteMany({
    where: { id: { in: staleVersions.map((version: { id: string }) => version.id) } },
  });
}
