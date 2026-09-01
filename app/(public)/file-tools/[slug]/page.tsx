/**
 * FILE: app/(public)/file-tools/[slug]/page.tsx
 * ROLE: Public — File Tools product detail page, served at
 * "/file-tools/[slug]".
 *
 * PURPOSE:
 * Looks up the matching product from lib/productsData.ts by slug
 * (scoped to the "file-tools" category) and renders it via the
 * shared ProductDetail component, per improvement_1.md Section 4's
 * "Product detail pages per category ([slug], variant selectors)"
 * item. Calls notFound() for any slug that isn't a known File Tools
 * product, which renders the sibling not-found.tsx in this route
 * segment.
 *
 * DATA FLOW:
 * 1. generateStaticParams pre-renders one page per known File Tools
 *    product slug.
 * 2. generateMetadata builds per-product SEO tags from the same data.
 * 3. The page component looks up the product again at request/render
 *    time, gathers its category siblings for the "More in this
 *    category" strip, and passes both to the Client Component
 *    ProductDetail.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../../styles/productDetail.css";
import ProductDetail from "@/components/products/ProductDetail";
import { PRODUCTS } from "@/lib/productsData";

const CATEGORY = "file-tools" as const;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

function getProduct(slug: string) {
  return PRODUCTS.find((product) => product.category === CATEGORY && product.slug === slug);
}

// Pre-render a static page for every known File Tools product slug
export async function generateStaticParams() {
  return PRODUCTS.filter((product) => product.category === CATEGORY).map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);

  // Unknown slug — return minimal metadata; the page itself calls notFound()
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

export default async function FileToolProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProduct(slug);

  // No matching File Tools product for this slug — render the not-found segment
  if (!product) {
    notFound();
  }

  const siblings = PRODUCTS.filter(
    (item) => item.category === CATEGORY && item.slug !== product.slug
  );

  return <ProductDetail product={product} siblings={siblings} />;
}
