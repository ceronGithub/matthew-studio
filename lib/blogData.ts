/**
 * FILE: lib/blogData.ts
 * PURPOSE:
 * Static placeholder content for the Blog (/blog) — item 7 of the
 * build plan, repurposed from generic "resort marketing guides" into
 * programming tutorials the site owner writes and pastes in below.
 *
 * DATA FLOW:
 * No database yet — replace/extend BLOG_POSTS with real tutorials.
 * Each post's `body` is an array of paragraph strings rendered as
 * <p> tags by TutorialDetail — add a new string per paragraph, or a
 * `{ heading: "..." }` entry to start a new section within a post.
 */

export type BlogBodyBlock = { heading: string } | { paragraph: string } | { code: string };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string; // e.g. "Aug 22, 2026"
  body: BlogBodyBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "getting-started-with-nextjs-app-router",
    title: "Getting Started with the Next.js App Router",
    excerpt:
      "A practical walkthrough of file-based routing, layouts, and Server Components for developers coming from the Pages Router.",
    category: "Next.js",
    readTime: "6 min read",
    publishedAt: "Aug 22, 2026",
    body: [
      { paragraph: "Replace this placeholder with your first tutorial. Paste each paragraph as its own entry in the body array." },
      { heading: "Why the App Router" },
      { paragraph: "Add your explanation here." },
      { code: "// Example code block\nexport default function Page() {\n  return <div>Hello</div>;\n}" },
    ],
  },
  {
    slug: "typescript-generics-for-real-projects",
    title: "TypeScript Generics for Real Projects",
    excerpt: "Moving past the textbook examples — where generics actually pay off in day-to-day application code.",
    category: "TypeScript",
    readTime: "8 min read",
    publishedAt: "Aug 22, 2026",
    body: [
      { paragraph: "Placeholder tutorial — replace with your own content." },
    ],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
