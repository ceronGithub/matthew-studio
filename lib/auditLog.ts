/**
 * FILE: lib/auditLog.ts
 * PURPOSE:
 * Rule 6 content-change audit trail — single shared helper for
 * writing an AuditLog row, called from the admin product
 * create/update/delete routes (Task 21) and any future admin-managed
 * entity (orders, users) per admin_account_specification.md Section
 * 6.1.
 *
 * Never called directly from a component — server-side only, same as
 * lib/notifications.ts. Deliberately never throws: the caller's real
 * action (the product save/delete) has already succeeded by the time
 * this runs and must not be rolled back by an audit-log failure —
 * same never-break-the-request pattern as lib/securityLog.ts's
 * logSecurityEvent() and lib/notifications.ts's createNotification().
 */
import { prisma } from "@/services/prisma";

export interface RecordAuditLogInput {
  entityType: string;
  entityId: string;
  actor: string;
  action: "created" | "updated" | "deleted";
  changes?: Record<string, { before: unknown; after: unknown }>;
  note?: string | null;
}

export async function recordAuditLog({
  entityType,
  entityId,
  actor,
  action,
  changes,
  note = null,
}: RecordAuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { entityType, entityId, actor, action, changes, note },
    });
  } catch (error) {
    console.error("[lib/auditLog] Failed to record audit log:", error);
  }
}

/**
 * diffProductFields
 * Builds the { field: { before, after } } shape recordAuditLog's
 * "changes" expects for action: "updated" — only fields that
 * actually changed, never the full row (Section 6.1's own example
 * shows only the 2 fields that changed, not a full row dump).
 */
export function diffProductFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }
  return changes;
}
