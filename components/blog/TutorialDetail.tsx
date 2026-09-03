/**
 * FILE: components/blog/TutorialDetail.tsx
 * ROLE: Public — full tutorial content on /blog/[slug].
 *
 * PURPOSE:
 * Renders a single BlogPost's body blocks in order — headings,
 * paragraphs, and code snippets — so pasting a new tutorial into
 * lib/blogData.ts is the only step needed to publish it.
 *
 * MOTION:
 * Header and body each get a single ScrollReveal entrance fade
 * (visitor_specification.md §3.1/§3.6, §6 "read-heavy" treatment —
 * same fade-only pattern as the legal pages, no card stagger since
 * this is one continuous article, not a list). Stays a Server
 * Component: ScrollReveal is a Client Component but can still wrap
 * server-rendered children passed to it.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { BlogPost } from "@/lib/blogData";

export default function TutorialDetail({ post }: { post: BlogPost }) {
  return (
    <>
      <header className="tutorialHeader">
        <ScrollReveal className="tutorialHeaderInner">
          <Link href="/blog" className="blogBackLink">
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back to Blog
          </Link>

          <p className="tutorialCategory">{post.category}</p>
          <h1 className="tutorialTitle">{post.title}</h1>
          <p className="tutorialExcerpt">{post.excerpt}</p>

          <div className="blogCardMeta">
            <span>{post.publishedAt}</span>
            <span aria-hidden="true">•</span>
            <span>{post.readTime}</span>
          </div>
        </ScrollReveal>
      </header>

      <section className="tutorialBodySection">
        <ScrollReveal className="tutorialBody" delay={0.1}>
          {post.body.map((block, index) => {
            if ("heading" in block) {
              return (
                <h2 key={index} className="tutorialHeading">
                  {block.heading}
                </h2>
              );
            }
            if ("code" in block) {
              return (
                <pre key={index} className="tutorialCodeBlock">
                  <code>{block.code}</code>
                </pre>
              );
            }
            return (
              <p key={index} className="tutorialParagraph">
                {block.paragraph}
              </p>
            );
          })}
        </ScrollReveal>
      </section>
    </>
  );
}
