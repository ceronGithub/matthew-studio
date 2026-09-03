/**
 * FILE: app/(public)/blog/page.tsx
 * ROLE: Public — Blog index, served at "/blog".
 *
 * PURPOSE:
 * Item 7 of the build plan, repurposed: lists programming tutorials
 * (not resort-marketing guides) as a card grid (BlogGrid), plus a
 * social media links row so visitors can follow along elsewhere.
 * Each card links to its own tutorial at /blog/[slug].
 *
 * DATA FLOW:
 * 1. This Server Component reads BLOG_POSTS and SOCIAL_LINKS directly
 *    (static arrays today).
 * 2. Posts are passed as props into the Client Component BlogGrid,
 *    which handles the entrance animations.
 */
import type { Metadata } from "next";
import "../../styles/blog.css";
import BlogGrid from "@/components/blog/BlogGrid";
import SocialLinks from "@/components/shared/SocialLinks";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { BLOG_POSTS } from "@/lib/blogData";

export const metadata: Metadata = {
  title: "Blog | Matthew Studio",
  description: "Programming tutorials and notes on building with Next.js, TypeScript, and Supabase.",
  openGraph: {
    title: "Blog | Matthew Studio",
    description: "Programming tutorials and notes on building with Next.js, TypeScript, and Supabase.",
    images: ["/og-blog.png"],
  },
};

export default function BlogPage() {
  return (
    <>
      <header className="blogPageHeader">
        <ScrollReveal className="blogPageHeaderInner">
          <p className="eyebrow">Blog</p>
          <h1 className="heroTitle" style={{ fontSize: "2.25rem" }}>
            Programming tutorials
          </h1>
          <p className="heroSubtitle">
            Notes and walkthroughs from building this template — Next.js, TypeScript, and Supabase.
          </p>
          <SocialLinks />
        </ScrollReveal>
      </header>

      <BlogGrid posts={BLOG_POSTS} />
    </>
  );
}
