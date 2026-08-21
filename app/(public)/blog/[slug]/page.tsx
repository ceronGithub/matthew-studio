/**
 * FILE: app/(public)/blog/[slug]/page.tsx
 * ROLE: Public — single tutorial page, served at "/blog/[slug]".
 *
 * PURPOSE:
 * Looks up the matching tutorial from lib/blogData.ts by slug and
 * renders it via TutorialDetail. Calls notFound() for any slug that
 * doesn't match a known post, which renders the sibling not-found.tsx.
 *
 * DATA FLOW:
 * 1. generateStaticParams pre-renders one page per known post slug.
 * 2. generateMetadata builds per-post SEO tags from the same data.
 * 3. The page component looks up the post again at request/render
 *    time and passes it to TutorialDetail.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../../styles/blog.css";
import TutorialDetail from "@/components/blog/TutorialDetail";
import { BLOG_POSTS, getBlogPostBySlug } from "@/lib/blogData";

interface TutorialPageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render a static page for every known tutorial slug at build time
export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: TutorialPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  // Unknown slug — return minimal metadata; the page itself calls notFound()
  if (!post) {
    return { title: "Tutorial Not Found | Matthew Studio" };
  }

  const title = `${post.title} | Matthew Studio Blog`;
  return {
    title,
    description: post.excerpt,
    openGraph: { title, description: post.excerpt, images: ["/og-blog.png"] },
  };
}

export default async function TutorialPage({ params }: TutorialPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  // No matching post for this slug — render the not-found segment
  if (!post) {
    notFound();
  }

  return <TutorialDetail post={post} />;
}
