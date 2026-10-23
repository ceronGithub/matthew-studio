/**
 * FILE: lib/errorMessages.ts
 * ROLE: Shared — every user-facing error sentence lives here, grouped by feature.
 *
 * PURPOSE:
 * Rule 34.1 asks for one centralized place for error messages instead of
 * strings scattered inside components. Each message says WHAT went wrong and
 * WHAT the visitor can do next, in plain English — never a technical term.
 * Messages that name a file are functions, so the visitor can tell which file
 * in a batch was refused.
 *
 * Started with the File Tools group (task-49e). Add new feature groups below
 * as new objects; do not mix them into fileToolMessages.
 */

/** Largest file the File Tools accept, in words, for the messages below. */
const fileSizeLimitText = "25MB";

/** Most files the File Tools accept at once, in words, for the messages below. */
const batchSizeLimitText = "50";

export const fileToolMessages = {
  /** The file has no content at all. */
  emptyFile: (fileName: string) =>
    `${fileName} is empty, so there is nothing to convert. Choose a file that has content.`,

  /** The file is over the per-file size limit. */
  fileTooLarge: (fileName: string) =>
    `${fileName} is larger than ${fileSizeLimitText}. Please choose a smaller file.`,

  /** The file is not a JPG, PNG, WEBP, HEIC or PDF. */
  unsupportedType: (fileName: string) =>
    `${fileName} isn't a supported file type. Use a JPG, PNG, WEBP, HEIC or PDF file.`,

  /** The extension says one thing, the contents say another (Section 2.4). */
  typeMismatch: (fileName: string) =>
    `${fileName} has an extension that doesn't match its contents. Rename it correctly or export it again.`,

  /** The queue is already full, so this file was left out. */
  batchTooLarge: (fileName: string) =>
    `${fileName} wasn't added because you can convert up to ${batchSizeLimitText} files at a time. Convert or remove some files first.`,

  /** Individual mode takes one file only. */
  singleFileOnly: (fileName: string) =>
    `${fileName} wasn't added because this mode converts one file at a time. Switch to bulk mode to add several files.`,

  /** Shown when the files could not even be read to be checked. */
  checkFailed: (fileName: string) =>
    `We couldn't read ${fileName}. Make sure the file isn't open in another program, then try again.`,

  /** Empty state under the drop zone. */
  emptyQueue: "No files yet. Drop files above or choose them from your device.",

  /** Heading above the list of refused files in the drop zone. */
  rejectedHeading: "Some files weren't added",

  /** The conversion step threw something the engine did not expect (it normally returns a reason instead). */
  conversionUnexpected: (fileName: string) =>
    `We couldn't convert ${fileName}. Please try again, or choose a different format.`,

  /** Building the ZIP of converted files failed. */
  zipFailed: "We couldn't build the ZIP file. Download the files one by one instead, or try again.",

  /** Nothing is ready to convert yet. */
  nothingToConvert: "Add at least one file before converting.",

  /** Rename & Download pressed but no row has a value the pattern can use. */
  nothingToRename:
    "There is nothing to rename yet. Fill in at least one detail for a file, or change the pattern.",

  /** The Rename mode only reads PDFs; an image was dropped in. */
  renameOnlyPdf: (fileName: string) =>
    `${fileName} wasn't added because renaming works on PDF invoices only. Use the Convert mode for images.`,
};

/** Session messages shown on the login page after the session ended (task-52b). */
export const sessionMessages = {
  /** Idle logout sent the user back to /auth/login?reason=idle. */
  idleLogout: "Your session expired due to inactivity. Please log in again.",
};

/**
 * Promo code messages shown at checkout (task-54b). One sentence per reason
 * returned by lib/couponPricing.ts. `notFound` and `expired` deliberately say
 * the same thing so a visitor can't use the wording to learn which codes exist.
 */
export const couponMessages = {
  /** The promo code box was submitted with nothing in it. */
  emptyCode: "Enter a promo code first, then try again.",

  /** The code doesn't exist or has been switched off. */
  notFound: "This promo code isn't valid or has expired. Check the code and try again.",

  /** The code is past its expiry date. Same wording as notFound on purpose. */
  expired: "This promo code isn't valid or has expired. Check the code and try again.",

  /** Every allowed redemption has already been used. */
  usageLimitReached: "This promo code has reached its redemption limit.",

  /** The code only covers one product category and the cart has nothing in it. */
  noMatchingItems: "This promo code doesn't apply to the items in your cart.",

  /** A free-shipping code on a cart with nothing to ship (no t-shirt). */
  freeShippingNotApplicable: "Free shipping only applies to orders that include a t-shirt.",
};

/** Every reason applyCoupon can reject a code for — matches the keys above. */
export type CouponRejectReason = keyof typeof couponMessages;

/**
 * Refund requests (task-55b). Every sentence says what happened and what the
 * buyer can do next. Window and status wording follows the /refund-policy page.
 */
export const refundMessages = {
  /** Order is not Delivered or Cancelled yet. */
  notEligibleStatus: "Refunds can only be requested for delivered or cancelled orders. Check back once your order arrives.",

  /** The order was never paid, so there is nothing to give back. */
  notPaid: "We can't find a completed payment for this order, so there is nothing to refund.",

  /** The order already went through a refund. */
  alreadyRefunded: "This order has already been refunded.",

  /** Digital-only order, more than 7 days after purchase. */
  windowClosedDigital: "The 7-day refund window for digital products has closed. You can still contact us from the support page.",

  /** Order with apparel, more than 14 days after delivery. */
  windowClosedApparel: "The 14-day refund window for apparel orders has closed. You can still contact us from the support page.",

  /** A request for this order is already waiting for review. */
  alreadyPending: "You already have a refund request for this order. We'll review it within 2-3 business days.",

  /** The reason dropdown was left empty or tampered with. */
  invalidReason: "Choose a reason for your refund request and try again.",

  /** The note is longer than the allowed length. */
  noteTooLong: "Your note is too long. Keep it under 500 characters.",

  /** Request saved. */
  submitted: "Refund request submitted. We'll review it within 2-3 business days.",
};

/**
 * adminRefundMessages
 * task-55d — copy for the admin refund queue and approve/deny routes.
 * Every message says what happened and what the admin can do next (Rule 34.1).
 */
export const adminRefundMessages = {
  /** No admin session on the request. */
  sessionExpired: "Your session has expired. Please log in again.",

  /** The admin lacks the manage-orders permission. */
  noPermission: "You don't have permission to manage refund requests.",

  /** The request id does not exist. */
  notFound: "We couldn't find that refund request. It may have been removed.",

  /** The decision value was not approve or deny. */
  invalidDecision: "Choose approve or deny and try again.",

  /** Deny was sent without a note. */
  denyNoteRequired: "Add a note explaining why this refund is denied. The buyer will see it.",

  /** Note longer than allowed. */
  noteTooLong: "That note is too long. Keep it under 500 characters.",

  /** The request was already approved or denied. */
  alreadyDecided: "This refund request has already been decided. Refresh the queue to see its latest state.",

  /** The order was already refunded another way (manual refund action), so approving would pay twice. */
  orderAlreadyRefunded: "This order is already marked as refunded, so approving would refund it twice. Deny this request with a note instead.",

  /** Manual "Issue refund" clicked on an order that is already Refunded. */
  manualAlreadyRefunded: "This order has already been refunded.",

  /** Manual "Issue refund" clicked while the buyer's refund request is still waiting. */
  manualHasPendingRequest: "This order has a pending refund request. Approve or deny it from the refund requests queue instead.",

  /** The order has no PayMongo payment id, so PayMongo cannot be asked to refund. */
  noPaymentOnFile: "This order has no PayMongo payment on file, so it can't be refunded automatically. Refund it from the PayMongo dashboard instead.",

  /** PayMongo refused or failed. Nothing was changed. */
  paymongoFailed: "PayMongo couldn't process this refund, so nothing was changed. Try again in a moment, or check the PayMongo dashboard.",

  /** PayMongo accepted the refund but saving it here failed. */
  savedAtPaymongoOnly: "PayMongo accepted the refund, but we couldn't save it here. Do not approve it again. Refund id:",

  /** Approved and the buyer was told. */
  approved: "Refund approved and sent to PayMongo. The buyer has been notified.",

  /** Denied and the buyer was told. */
  denied: "Refund denied. The buyer has been notified.",

  /** Anything unexpected. */
  generic: "We couldn't complete this action. Please try again.",
};

/**
 * OAuth login (task-56a). Shown on /auth/login after a blocked Google or
 * Facebook sign-in. Keys match the "block_*" outcomes in lib/oauthAccountPolicy.ts
 * without the prefix, so the callback and the login page stay in step.
 */
export const oauthMessages = {
  /** The email already belongs to a password account. We never link silently. */
  passwordAccount: "This email already has an account with a password. Log in with your email and password instead.",

  /** The email belongs to a staff account, which never uses OAuth. */
  staffAccount: "This account can't sign in with Google or Facebook. Log in with your email and password instead.",

  /** The provider gave no email, or one it has not verified. */
  noEmail: "We couldn't get a verified email address from that account. Use another sign-in method or register with your email.",

  /** Too many OAuth attempts from one network in a short time. */
  rateLimited: "Too many sign-in attempts. Please wait a few minutes and try again.",

  /** The sign-in looked unusual (for example an impossible location jump) and was stopped. */
  unusualActivity: "This sign-in was blocked due to unusual activity. Please try again or contact support.",

  /** Anything unexpected during the OAuth sign-in. */
  generic: "We couldn't sign you in with that account. Please try again.",
};

/**
 * getOAuthErrorMessage
 * Turns the ?oauthError=<code> value from the login URL into a message.
 * Anything missing or unrecognised gets the generic message, so a made-up
 * code in the URL can never show arbitrary text.
 */
export function getOAuthErrorMessage(code: string | null | undefined): string {
  if (code === "password_account") return oauthMessages.passwordAccount;
  if (code === "staff_account") return oauthMessages.staffAccount;
  if (code === "no_email") return oauthMessages.noEmail;
  if (code === "rate_limited") return oauthMessages.rateLimited;
  if (code === "unusual_activity") return oauthMessages.unusualActivity;
  return oauthMessages.generic;
}
