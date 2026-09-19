/**
 * FILE: lib/adminAnnouncementValidation.ts
 * PURPOSE:
 * Shared validation constants and helpers for the announcement
 * create/update routes (super_admin_account_specification.md Section
 * 3.9). Pulled out of the route files so POST and PUT never drift
 * out of sync on what counts as a valid placement/status, same
 * separation lib/adminProductValidation.ts already uses for products.
 */

export const VALID_PLACEMENTS = ["homepage-banner", "shop-banner", "login-toast"];
export const VALID_STATUSES = ["draft", "scheduled", "live"];

// Same first-line-of-defense regex already used on product text
// fields (Rule 18.1) — consistent across admin text inputs.
export const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

export const MESSAGE_MAX_LENGTH = 500;

export interface AnnouncementInput {
  title: string;
  message: string;
  placement: string;
  status: string;
  publishAt: Date | null;
  expiresAt: Date | null;
}

export interface AnnouncementValidationError {
  field: string;
  message: string;
}

/**
 * validateAnnouncementInput
 * Cleans (trim + strip forbidden characters) and validates the
 * fields Section 3.9's create/edit form lists. Returns the cleaned
 * values plus a list of field errors — empty list means the input is
 * good to save.
 */
export function validateAnnouncementInput(body: Record<string, unknown>): {
  cleaned: AnnouncementInput;
  errors: AnnouncementValidationError[];
} {
  const errors: AnnouncementValidationError[] = [];

  const title = String(body.title ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
  const message = String(body.message ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
  const placement = String(body.placement ?? "").trim();
  const status = String(body.status ?? "draft").trim();

  // publishAt is required per Section 3.9 ("now" or scheduled — the
  // UI resolves "now" to the current timestamp before sending it
  // here; this route never special-cases the string "now" itself).
  const rawPublishAt = body.publishAt ? new Date(body.publishAt as string) : null;
  const publishAt = rawPublishAt && !Number.isNaN(rawPublishAt.getTime()) ? rawPublishAt : null;

  // expiresAt is optional — blank means manual dismiss only, per the
  // schema comment on Announcement.expiresAt.
  const rawExpiresAt = body.expiresAt ? new Date(body.expiresAt as string) : null;
  const expiresAt = rawExpiresAt && !Number.isNaN(rawExpiresAt.getTime()) ? rawExpiresAt : null;

  if (title.length < 2 || title.length > 150) {
    errors.push({ field: "title", message: "Title must be between 2 and 150 characters." });
  }
  if (message.length < 1 || message.length > MESSAGE_MAX_LENGTH) {
    errors.push({
      field: "message",
      message: `Message is required and must be under ${MESSAGE_MAX_LENGTH} characters.`,
    });
  }
  if (!VALID_PLACEMENTS.includes(placement)) {
    errors.push({ field: "placement", message: "Choose a valid placement." });
  }
  if (!VALID_STATUSES.includes(status)) {
    errors.push({ field: "status", message: "Status must be Draft, Scheduled, or Live." });
  }
  if (!publishAt) {
    errors.push({ field: "publishAt", message: "Publish date is required." });
  }
  if (publishAt && expiresAt && expiresAt.getTime() <= publishAt.getTime()) {
    errors.push({ field: "expiresAt", message: "Expiry date must be after the publish date." });
  }

  return {
    cleaned: { title, message, placement, status, publishAt, expiresAt },
    errors,
  };
}
