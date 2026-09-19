/**
 * FILE: app/(public)/tutorials/[slug]/page.tsx
 * ROLE: Public — Tutorials product detail page, served at
 * "/tutorials/[slug]".
 *
 * PURPOSE:
 * Looks up the matching product from the database by slug (task-121's
 * PUBLIC_PRODUCT_DETAIL_SELECT/toPublicProduct, same as
 * /api/shop/products/[slug]) and renders it via the shared
 * ProductDetail component. Replaces task-124's static
 * lib/productsData.ts lookup, which never saw a DB-only product and
 * 404'd its "View Details" link (same gap task-126/127/128 fixed for
 * Game Characters/T-Shirts/File Tools). Calls notFound() for any slug
 * that isn't a published Tutorials product, which renders the
 * sibling not-found.tsx in this route segment.
 *
 * Note: this is a marketplace product listing for a Tutorials course
 * bundle, distinct from the editorial /blog/[slug] route, which is a
 * separate content-article system (lib and components do not overlap).
 *
 * DATA FLOW:
 * 1. This is a Server Component — it queries Prisma directly (Rule
 *    31.2: Server Components fetch directly, no API route needed),
 *    reusing the exact same select/mapping the public API uses so the
 *    two never drift apart.
 * 2. A row is only used if `status: "published"` and not soft-deleted
 *    AND its category matches this route segment — a wrong-category
 *    slug is treated as not-found here (matches the old static
 *    behavior, which filtered by category before matching slug).
 * 3. Metadata and the page body both look the product up (metadata
 *    runs first, separately, per Next.js), so this can no longer be
 *    pre-rendered at build time — the route is force-dynamic.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../../styles/productDetail.css";
import ProductDetail from "@/components/products/ProductDetail";
import { prisma } from "@/services/prisma";
import { PUBLIC_PRODUCT_SELECT, PUBLIC_PRODUCT_DETAIL_SELECT, toPublicProduct } from "@/lib/publicProduct";
import type { Product } from "@/lib/productsData";

// A DB-only product can be published at any time, so this route can
// never be statically generated the way the static catalog allowed.
export const dynamic = "force-dynamic";

const CATEGORY = "tutorials" as const;

/**
 * getProduct
 * Fetches one published, non-deleted product by slug. Returns null
 * (never throws) for a missing/unpublished/deleted row, or a row
 * whose category doesn't match this route segment — all three cases
 * are indistinguishable "not found" to the visitor, same as the
 * public API route.
 */
async function getProduct(slug: string): Promise<Product | null> {
  const row = await prisma.product.findFirst({
    where: { slug, status: "published", deletedAt: null },
    select: PUBLIC_PRODUCT_DETAIL_SELECT,
  });

  if (!row || row.category !== CATEGORY) return null;

  // Same cast the client-side hooks already use (lib/hooks/useShopProducts.ts) —
  // toPublicProduct's PublicProduct shape matches Product by construction.
  return toPublicProduct(row) as unknown as Product;
}

/**
 * getSiblings
 * Every other published Tutorials product, for the "More in this
 * category" strip. No gallery images needed here, so the lighter
 * list select is used instead of the detail select.
 */
async function getSiblings(excludeSlug: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { category: CATEGORY, status: "published", deletedAt: null, slug: { not: excludeSlug } },
    select: PUBLIC_PRODUCT_SELECT,
    orderBy: { trendingScore: "desc" },
  });

  return rows.map(toPublicProduct) as unknown as Product[];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  // Unknown/unpublished slug — return minimal metadata; the page itself calls notFound()
  if (!product) {
    return { title: "Product Not Found | Matthew Studio" };
  }

  const title = `${product.name} | Matthew Studio`;
  return {
    title,
    description: product.description,
    openGraph: { title, description: product.description, images: ["/og-home.png"] },
  };
}

export default async function TutorialProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  // No matching published Tutorials product for this slug — render the not-found segment
  if (!product) {
    notFound();
  }

  const siblings = await getSiblings(product.slug);

  return <ProductDetail product={product} siblings={siblings} />;
}
