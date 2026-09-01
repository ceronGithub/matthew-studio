/**
 * FILE: app/(public)/tutorials/[slug]/not-found.tsx
 * ROLE: Public — rendered when a /tutorials/[slug] URL doesn't match
 * any known Tutorials product (Rule 31.10).
 *
 * PURPOSE:
 * Friendly dead-end for a bad or removed product link, with a clear
 * path back to the Tutorials category page.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "../../../styles/productDetail.css";

export default function TutorialProductNotFound() {
  return (
    <div className="productDetailPage">
      <div className="productDetailInner">
        <p className="eyebrow">404</p>
        <h1 className="heroTitle" style={{ fontSize: "2rem" }}>
          We couldn&apos;t find that product
        </h1>
        <p className="heroSubtitle">
          It may have been renamed or removed. Take a look at the full Tutorials category
          instead.
        </p>
        <Link href="/tutorials" className="buttonPrimary" style={{ marginTop: "1.5rem" }}>
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          Back to Tutorials
        </Link>
      </div>
    </div>
  );
}
