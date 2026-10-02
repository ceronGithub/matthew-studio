/**
 * FILE: lib/couponValidation.ts
 * ROLE: Server-side only — used by the super-admin coupon routes.
 *
 * PURPOSE:
 * One place for the rules a coupon must pass before it is saved or changed.
 * Both app/api/superadmin/coupons/route.ts (create) and
 * app/api/superadmin/coupons/[couponId]/route.ts (switch off / limit / expiry)
 * import from here, so the two routes can never disagree about what a valid
 * coupon is. Same shared-validation pattern as lib/adminAnnouncementValidation.ts.
 *
 * DATA FLOW:
 * 1. A route passes the raw request body to createCouponSchema or updateCouponSchema.
 * 2. The code is trimmed and upper-cased first, so "save10 " is stored as "SAVE10"
 *    (Rule 6 normalization — matches how applyCoupon looks codes up).
 * 3. On failure the route returns the first error message in the Rule 28 shape.
 */
import { z } from "zod";
import { CATEGORY_SHOWCASE } from "@/lib/categoryShowcaseData";

// The 6 real catalog categories, read from the same list the homepage uses so
// there is no second list to keep in sync.
const VALID_CATEGORY_SLUGS: string[] = CATEGORY_SHOWCASE.map((category) => category.slug);

export const DISCOUNT_TYPES = ["percentage", "fixed", "free_shipping"] as const;
export type CouponDiscountType = (typeof DISCOUNT_TYPES)[number];

// Letters and digits only — no hyphens, because Rule 18.1 strips "-" from the
// checkout promo field, so a code containing one could never be typed in.
const CODE_PATTERN = /^[A-Z0-9]{3,32}$/;

/**
 * isParsableDate
 * True when the text is a real date, so "not a date" can't reach Prisma.
 */
function isParsableDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

const codeSchema = z
  .string({ error: "Enter a promo code." })
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z.string().regex(CODE_PATTERN, {
      error: "Promo codes must be 3 to 32 characters, using only letters and numbers.",
    })
  );

const usageLimitSchema = z
  .number({ error: "Usage limit must be a number." })
  .int({ error: "Usage limit must be a whole number." })
  .min(1, { error: "Usage limit must be at least 1." });

const expiresAtSchema = z
  .string({ error: "Expiry must be a date." })
  .refine(isParsableDate, { error: "Expiry must be a valid date." });

/**
 * createCouponSchema
 * Rules for a brand-new coupon. The type decides how discountValue is read:
 * percentage 1-100, fixed above 0, free_shipping always 0 (and only for
 * t-shirt orders, so its category is either none or "tshirts").
 */
export const createCouponSchema = z
  .object({
    code: codeSchema,
    discountType: z.enum(DISCOUNT_TYPES, { error: "Choose percentage, fixed or free shipping." }),
    discountValue: z.number({ error: "Discount value must be a number." }).default(0),
    usageLimit: usageLimitSchema.nullable().default(null),
    expiresAt: expiresAtSchema.nullable().default(null),
    scopeCategory: z
      .string()
      .refine((slug) => VALID_CATEGORY_SLUGS.includes(slug), {
        error: "Pick a category that exists in the catalog.",
      })
      .nullable()
      .default(null),
  })
  .superRefine((input, context) => {
    if (input.discountType === "percentage") {
      if (input.discountValue < 1 || input.discountValue > 100) {
        context.addIssue({
          code: "custom",
          path: ["discountValue"],
          message: "A percentage discount must be between 1 and 100.",
        });
      }
    }

    if (input.discountType === "fixed" && !(input.discountValue > 0)) {
      context.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "A fixed discount must be more than 0.",
      });
    }

    if (input.discountType === "free_shipping") {
      if (input.discountValue !== 0) {
        context.addIssue({
          code: "custom",
          path: ["discountValue"],
          message: "A free shipping code has no discount value — leave it at 0.",
        });
      }
      if (input.scopeCategory !== null && input.scopeCategory !== "tshirts") {
        context.addIssue({
          code: "custom",
          path: ["scopeCategory"],
          message: "Free shipping only applies to t-shirt orders.",
        });
      }
    }

    // A coupon that is already expired when it is created can never be used.
    if (input.expiresAt !== null && Date.parse(input.expiresAt) <= Date.now()) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "The expiry date must be in the future.",
      });
    }
  });

/**
 * updateCouponSchema
 * The ONLY fields that may change after a coupon exists. Code, type, value and
 * category are locked because past orders may already have used them.
 * .strict() rejects any other field instead of silently ignoring it.
 */
export const updateCouponSchema = z
  .object({
    isActive: z.boolean({ error: "isActive must be true or false." }).optional(),
    usageLimit: usageLimitSchema.nullable().optional(),
    expiresAt: expiresAtSchema.nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    error: "Send at least one field to change.",
  });

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
