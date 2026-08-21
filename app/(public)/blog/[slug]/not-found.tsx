/**
 * FILE: app/(public)/blog/[slug]/not-found.tsx
 * ROLE: Public — rendered when a /blog/[slug] URL doesn't match any
 * known tutorial.
 *
 * PURPOSE:
 * Friendly dead-end for a bad or removed tutorial link, with a clear
 * path back to the full blog index.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "../../../styles/blog.css";

export default function TutorialNotFound() {
  return (
    <div className="blogNotFound">
      <p className="eyebrow">404</p>
      <h1 className="heroTitle" style={{ fontSize: "2rem" }}>
        We couldn&apos;t find that tutorial
      </h1>
      <p className="heroSubtitle">
        It may have been renamed or removed. Take a look at the full blog instead.
      </p>
      <Link href="/blog" className="buttonPrimary">
        <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        Back to Blog
      </Link>
    </div>
  );
}
