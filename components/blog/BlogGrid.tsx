/**
 * FILE: components/blog/BlogGrid.tsx
 * ROLE: Public — main content of the Blog page (/blog).
 *
 * PURPOSE:
 * Renders every tutorial as a card in a responsive grid. Each card
 * links to its own tutorial page at /blog/[slug]. Entrance animation
 * is staggered per card via framer-motion, same pattern as
 * PortfolioGrid.
 */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blogData";

export default function BlogGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="blogGridSection">
      <div className="blogGrid">
        {posts.map((post, index) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
          >
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
          </motion.div>
        ))}
      </div>
    </section>
  );
}
