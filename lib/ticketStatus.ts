/**
 * FILE: lib/ticketStatus.ts
 * PURPOSE:
 * Single source of truth for turning a raw SupportTicket.status value
 * into a buyer-facing label + badge color, shared by
 * SupportTicketsList.tsx (Task 09) and the ticket detail thread page
 * (Task 10). Mirrors lib/orderStatus.ts's pattern for consistency
 * across the buyer account area.
 *
 * SupportTicket.status's stored values (prisma/schema.prisma):
 * "open" | "answered" | "closed". "answered" means an admin has
 * replied and the buyer hasn't followed up yet — distinct from
 * "open" (awaiting an admin reply) so a buyer can tell at a glance
 * whether the ball is in their court.
 */

export type TicketStatusKey = "open" | "answered" | "closed";

interface TicketStatusDisplay {
  label: string;
  colorVar: "--color-warning" | "--color-info" | "--color-success";
}

const TICKET_STATUS_DISPLAY: Record<TicketStatusKey, TicketStatusDisplay> = {
  open: { label: "Open", colorVar: "--color-warning" },
  answered: { label: "Answered", colorVar: "--color-info" },
  closed: { label: "Closed", colorVar: "--color-success" },
};

/**
 * resolveTicketStatusKey
 * Normalizes a raw SupportTicket.status string into one of the 3
 * display buckets above, defaulting to "open" for any unrecognized
 * value rather than crashing the list render.
 */
function resolveTicketStatusKey(rawStatus: string): TicketStatusKey {
  const normalized = rawStatus.toLowerCase();
  if (normalized === "answered" || normalized === "closed") return normalized;
  return "open";
}

export function getTicketStatusDisplay(rawStatus: string): TicketStatusDisplay {
  return TICKET_STATUS_DISPLAY[resolveTicketStatusKey(rawStatus)];
}
