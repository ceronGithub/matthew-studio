/**
 * FILE: components/auth/AuthBackgroundSlideshow.tsx
 * ROLE: Auth — ambient full-bleed background behind the sign-in / register glass card.
 *
 * PURPOSE:
 * Cross-fades between AUTH_BACKGROUND_SLIDES on a fixed timer. This
 * background is intentionally NOT linked to which tab is active
 * (Mockup 2) — it just keeps cycling in the background regardless of
 * Sign In vs Create Account. A dark scrim renders on top so the glass
 * card and its white text stay legible against every slide.
 */
"use client";

import { useEffect, useState } from "react";
import { AUTH_BACKGROUND_SLIDES, AUTH_BACKGROUND_SLIDE_INTERVAL_MS } from "@/lib/authData";

export default function AuthBackgroundSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion — freeze on the first slide instead
    // of auto-advancing, per login_and_registration_page.md Section 3.
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % AUTH_BACKGROUND_SLIDES.length);
    }, AUTH_BACKGROUND_SLIDE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="authBackgroundSlideshow" aria-hidden="true">
      {AUTH_BACKGROUND_SLIDES.map((slide, index) => (
        <div
          key={slide.id}
          className="authBackgroundSlide"
          style={{
            backgroundImage: `url(${slide.imageSrc})`,
            opacity: index === activeIndex ? 1 : 0,
          }}
        />
      ))}
      <div className="authBackgroundScrim" />
    </div>
  );
}
