/**
 * FILE: lib/publicProduct.ts
 * ROLE: Public storefront — shared by app/api/shop/products/route.ts
 * and app/api/shop/products/[slug]/route.ts.
 *
 * PURPOSE:
 * Turns a raw `Product` database row into the exact shape the storefront
 * already understands (`Product` in lib/productsData.ts), so the UI swap
 * in task-122 is a drop-in. It also decides which columns are safe to
 * show the public: admin emails (createdBy/updatedBy), storage keys, and
 * the internal status/deletedAt fields are deliberately never selected.
 *
 * DATA FLOW:
 * 1. A route queries Prisma with PUBLIC_PRODUCT_SELECT (only safe columns).
 * 2. The route passes each row to toPublicProduct().
 * 3. The mapped object is returned inside the Rule 28 response shape.
 */

/**
 * PUBLIC_PRODUCT_SELECT
 * The only Product columns the public API is allowed to read. Anything
 * not listed here (createdBy, updatedBy, status, deletedAt, coverImageKey,
 * previewVideoKey) can never leak into a public response.
 */
export const PUBLIC_PRODUCT_SELECT = {
  id: true,
  slug: true,
  category: true,
  categoryLabel: true,
  name: true,
  description: true,
  iconName: true,
  startingPrice: true,
  pricingDetails: true,
  ratingAverage: true,
  ratingCount: true,
  badge: true,
  dateAdded: true,
  trendingScore: true,
  variants: true,
  coverImageUrl: true,
  previewVideoUrl: true,
} as const;

/** Same as PUBLIC_PRODUCT_SELECT plus the gallery — detail page only. */
export const PUBLIC_PRODUCT_DETAIL_SELECT = {
  ...PUBLIC_PRODUCT_SELECT,
  galleryImages: {
    orderBy: { sortOrder: "asc" },
    select: { url: true, sortOrder: true },
  },
} as const;

const VALID_BADGES = ["bestseller", "new", "limited"] as const;
type PublicBadge = (typeof VALID_BADGES)[number] | null;

export interface PublicProductRow {
  id: string;
  slug: string;
  category: string;
  categoryLabel: string;
  name: string;
  description: string;
  iconName: string;
  startingPrice: number;
  pricingDetails: unknown;
  ratingAverage: number;
  ratingCount: number;
  badge: string | null;
  dateAdded: Date;
  trendingScore: number;
  variants: unknown;
  coverImageUrl: string | null;
  previewVideoUrl: string | null;
  galleryImages?: { url: string; sortOrder: number }[];
}

export interface PublicProduct {
  id: string;
  slug: string;
  category: string;
  categoryLabel: string;
  name: string;
  description: string;
  iconName: string;
  price: {
    startingPrice: number;
    managed?: { monthly: number; annual: number };
    selfHosted?: number;
    custom?: number;
  };
  rating: { average: number; count: number };
  badge: PublicBadge;
  dateAdded: string;
  trendingScore: number;
  variants?: unknown[];
  coverImageUrl: string | null;
  previewVideoUrl: string | null;
  galleryImages?: { url: string; sortOrder: number }[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * buildPriceObject
 * Combines the always-present startingPrice with the optional
 * Templates-only tier breakdown stored in `pricingDetails`
 * ({ managed?: {monthly, annual}, selfHosted?, custom? }). Every tier
 * field is type-checked, so a malformed JSON value in the database is
 * skipped instead of crashing the storefront.
 */
function buildPriceObject(startingPrice: number, pricingDetails: unknown): PublicProduct["price"] {
  const price: PublicProduct["price"] = { startingPrice };
  if (!isPlainObject(pricingDetails)) return price;

  const managed = pricingDetails.managed;
  if (
    isPlainObject(managed) &&
    typeof managed.monthly === "number" &&
    typeof managed.annual === "number"
  ) {
    price.managed = { monthly: managed.monthly, annual: managed.annual };
  }
  if (typeof pricingDetails.selfHosted === "number") price.selfHosted = pricingDetails.selfHosted;
  if (typeof pricingDetails.custom === "number") price.custom = pricingDetails.custom;

  return price;
}

/**
 * toPublicProduct
 * Maps one database row to the storefront's Product shape (see file
 * header). `galleryImages` is only included when the row carries it
 * (detail query), and `variants` only when it is a real array
 * (Templates only).
 */
export function toPublicProduct(row: PublicProductRow): PublicProduct {
  const badge = VALID_BADGES.find((validBadge) => validBadge === row.badge) ?? null;

  const publicProduct: PublicProduct = {
    id: row.id,
    slug: row.slug,
    category: row.category,
    categoryLabel: row.categoryLabel,
    name: row.name,
    description: row.description,
    iconName: row.iconName,
    price: buildPriceObject(row.startingPrice, row.pricingDetails),
    rating: { average: row.ratingAverage, count: row.ratingCount },
    badge,
    dateAdded: row.dateAdded.toISOString(),
    trendingScore: row.trendingScore,
    coverImageUrl: row.coverImageUrl,
    previewVideoUrl: row.previewVideoUrl,
  };

  if (Array.isArray(row.variants)) publicProduct.variants = row.variants;
  if (row.galleryImages) publicProduct.galleryImages = row.galleryImages;

  return publicProduct;
}
