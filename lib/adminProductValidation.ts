/**
 * FILE: lib/adminProductValidation.ts
 * PURPOSE:
 * Shared validation constants and helpers for the admin product
 * create/update routes (admin_account_specification.md Section
 * 3.2.2). Pulled out of the route files so POST and PUT never drift
 * out of sync on what counts as a valid category/status/price.
 *
 * CATEGORY_LABELS mirrors lib/productsData.ts's ProductCategorySlug
 * union — that file has no exported label map (every consumer so far
 * just duplicates the pairing inline), so this is the first shared
 * source of truth for it. Not touching productsData.ts itself here;
 * out of scope for this task.
 */

export const CATEGORY_LABELS: Record<string, string> = {
  templates: "Templates",
  tshirts: "T-Shirts",
  "ai-videos": "AI Videos",
  "file-tools": "File Tools",
  tutorials: "Tutorials",
  "game-characters": "Game Characters",
};

export const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS);
export const VALID_STATUSES = ["draft", "published"];

// Same first-line-of-defense regex already used on buyer profile /
// registration text fields (Rule 18.1) — kept consistent rather than
// applying the fuller character set from the rule text literally,
// which would strip normal punctuation out of product descriptions.
export const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

export interface ProductInput {
  name: string;
  category: string;
  description: string;
  price: number;
  status: string;
  tags: string;
  featured: boolean;
}

export interface ProductValidationError {
  field: string;
  message: string;
}

/**
 * validateProductInput
 * Cleans (trim + strip forbidden characters) and validates the
 * fields admin_account_specification.md Section 3.2.2 lists for the
 * product form. Returns the cleaned values plus a list of field
 * errors — empty list means the input is good to save.
 */
export function validateProductInput(body: Record<string, unknown>): {
  cleaned: ProductInput;
  errors: ProductValidationError[];
} {
  const errors: ProductValidationError[] = [];

  const name = String(body.name ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
  const category = String(body.category ?? "").trim();
  const description = String(body.description ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
  const price = Number(body.price);
  const status = String(body.status ?? "draft").trim();
  const tags = String(body.tags ?? "").trim().replace(FORBIDDEN_CHARACTERS, "");
  const featured = Boolean(body.featured);

  if (name.length < 2 || name.length > 100) {
    errors.push({ field: "name", message: "Product name must be between 2 and 100 characters." });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    errors.push({ field: "category", message: "Choose a valid category." });
  }
  if (description.length < 1 || description.length > 1000) {
    errors.push({ field: "description", message: "Description is required and must be under 1000 characters." });
  }
  if (!Number.isFinite(price) || price <= 0) {
    errors.push({ field: "price", message: "Price must be greater than 0." });
  }
  if (!VALID_STATUSES.includes(status)) {
    errors.push({ field: "status", message: "Status must be either Draft or Published." });
  }

  return {
    cleaned: { name, category, description, price, status, tags, featured },
    errors,
  };
}

/**
 * slugify
 * Lowercase, hyphen-separated slug from a product name. Route
 * handlers append a short random suffix on a collision rather than
 * this function looping against the DB — keeps this a pure function.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
