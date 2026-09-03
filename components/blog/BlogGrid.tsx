/**
 * FILE: components/blog/BlogGrid.tsx
 * ROLE: Public — main content of the Blog page (/blog).
 *
 * PURPOSE:
 * Renders every tutorial as a card in a responsive grid. Each card
 * links to its own tutorial page at /blog/[slug]. Entrance animation
 * uses the shared ScrollReveal primitive (visitor_specification.md
 * §3.1/§3.6) with the same 0.06s/card stagger as /products and the
 * six category grids — this replaces a prior hand-rolled motion.div
 * stagger that had no prefers-reduced-motion handling, the same
 * normalization TutorialsSection.tsx got in Implementation Order
 * Step 2.
 */
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { BlogPost } from "@/lib/blogData";

export default function BlogGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="blogGridSection">
      <div className="blogGrid">
        {posts.map((post, index) => (
          <ScrollReveal key={post.slug} delay={index * 0.06}>
            <Link href={`/blog/${post.slug}`} className="blogCard">
              <p className="blogCardCategory">{post.category}</p>
              <h2 className="blogCardTitle">{post.title}</h2>
              <p className="blogCardExcerpt">{post.excerpt}</p>

              <div className="blogCardMeta">
                <span>{post.publishedAt}</span>
                <span aria-hidden="true">•</span>
                <span>{post.readTime}</span>
              </div>

              <div className="blogCardFooter">
                Read tutorial
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
