/**
 * FILE: scripts/seedProducts.ts
 * PURPOSE:
 * One-off/re-runnable seed script (task-125). `/products` and the
 * category pages now read the live Product table (task-121/122/126..
 * 131), but nothing has ever inserted the 18 products from the old
 * static lib/productsData.ts catalog — a fresh database shows an
 * empty grid until an admin creates products by hand. This script
 * fixes that once, and can be safely re-run any time afterward.
 *
 * CONNECTION: uses DIRECT_URL (Supabase Session Pooler), not the
 * app's DATABASE_URL transaction pooler — Rule 37.2 reserves
 * DIRECT_URL for schema/seed-type operations, same reasoning as
 * scripts/runBackup.ts's pg_dump connection. services/prisma.ts is
 * deliberately NOT reused here; that client is DATABASE_URL-only for
 * live app request traffic.
 *
 * Never triggered by an incoming request — invoked only via
 * `npm run seed:products`.
 *
 * MAPPING (static Product -> Prisma Product):
 *   id                          -> not reused as the DB id (DB uses
 *                                  its own cuid()); slug is the only
 *                                  stable identifier carried over
 *   price.startingPrice         -> startingPrice
 *   price.{managed,selfHosted,
 *          custom}              -> pricingDetails (Json, Templates only)
 *   rating.{average,count}      -> ratingAverage / ratingCount
 *   dateAdded, trendingScore    -> unchanged
 *   variants                    -> variants (Json, Templates only)
 *   (no status in the static
 *    catalog)                   -> status: "published" (Rule 6/9.2 —
 *                                  these are the site's existing live
 *                                  catalog, not drafts)
 *
 * Upserts by `slug` (@unique) so this is safe to re-run — never
 * creates duplicates, never deletes anything a real admin has since
 * added or edited by hand (only touches rows matching a static-catalog
 * slug).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PRODUCTS } from "../lib/productsData";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error("DIRECT_URL is not set — required for the seed script (Rule 37.2).");
}

const adapter = new PrismaPg({ connectionString: directUrl });
const prisma = new PrismaClient({ adapter });

/**
 * buildPricingDetails
 * Templates-only tier breakdown -> the Product.pricingDetails Json
 * column. Every other category has no managed/selfHosted/custom
 * fields on the static catalog, so this returns undefined for them
 * (column stays null) rather than an object of undefined values.
 */
function buildPricingDetails(price: (typeof PRODUCTS)[number]["price"]) {
  const { managed, selfHosted, custom } = price;
  if (managed === undefined && selfHosted === undefined && custom === undefined) {
    return undefined;
  }
  return { managed, selfHosted, custom };
}

async function seedProducts() {
  let createdCount = 0;
  let updatedCount = 0;

  for (const product of PRODUCTS) {
    // upsert() itself tells us create vs update via the returned row's
    // createdAt/updatedAt equality on first insert — cheaper to just
    // check existence first so the count is accurate either way.
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });

    await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        category: product.category,
        categoryLabel: product.categoryLabel,
        name: product.name,
        description: product.description,
        iconName: product.iconName,
        startingPrice: product.price.startingPrice,
        pricingDetails: buildPricingDetails(product.price),
        ratingAverage: product.rating.average,
        ratingCount: product.rating.count,
        badge: product.badge ?? undefined,
        dateAdded: new Date(product.dateAdded),
        trendingScore: product.trendingScore,
        variants: product.variants ?? undefined,
        status: "published",
      },
      update: {
        category: product.category,
        categoryLabel: product.categoryLabel,
        name: product.name,
        description: product.description,
        iconName: product.iconName,
        startingPrice: product.price.startingPrice,
        pricingDetails: buildPricingDetails(product.price),
        ratingAverage: product.rating.average,
        ratingCount: product.rating.count,
        badge: product.badge ?? undefined,
        dateAdded: new Date(product.dateAdded),
        trendingScore: product.trendingScore,
        variants: product.variants ?? undefined,
      },
    });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  console.log(
    `[seed:products] Done. ${createdCount} created, ${updatedCount} updated, ${PRODUCTS.length} total in catalog.`
  );
}

seedProducts()
  .catch((error) => {
    console.error("[seed:products] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
