/**
 * FILE: components/blog/TutorialDetail.tsx
 * ROLE: Public — full tutorial content on /blog/[slug].
 *
 * PURPOSE:
 * Renders a single BlogPost's body blocks in order — headings,
 * paragraphs, and code snippets — so pasting a new tutorial into
 * lib/blogData.ts is the only step needed to publish it.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { BlogPost } from "@/lib/blogData";

export default function TutorialDetail({ post }: { post: BlogPost }) {
  return (
    <>
      <header className="tutorialHeader">
        <div className="tutorialHeaderInner">
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
        </div>
      </header>

      <section className="tutorialBodySection">
        <div className="tutorialBody">
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
        </div>
      </section>
    </>
  );
}
