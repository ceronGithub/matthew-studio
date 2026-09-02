/**
 * FILE: components/home/TestimonialsSection.tsx
 * ROLE: Public — "What Our Creators Say" section of the homepage.
 *
 * PURPOSE:
 * Shows quotes from creators across different marketplace categories.
 * On tablet/desktop it auto-scrolls horizontally right-to-left in an
 * infinite loop (pauses on hover); on mobile it renders as a plain
 * vertical stack instead — same responsive pattern as
 * components/home/FeaturedProducts.tsx, so the two carousels behave
 * identically to the visitor even though this one scrolls the
 * opposite direction and at a different speed per the homepage spec
 * (18s here vs. 20s for Featured Products).
 *
 * DATA FLOW:
 * Reads HOME_TESTIMONIALS (static). No real avatar photos exist yet,
 * so each card shows an initials avatar — swap for next/image once
 * real creator photos are available (Rule 27).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { HOME_TESTIMONIALS, type HomeTestimonial } from "@/lib/homeTestimonialsData";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Duplicated once so the auto-scroll can jump from the end of the first
// copy back to 0 the instant it crosses the halfway point — the two
// copies look identical at that boundary, so the reset is invisible.
const LOOP_TESTIMONIALS = [...HOME_TESTIMONIALS, ...HOME_TESTIMONIALS];

// Roughly one card-width per arrow click (card + gap, see home.css).
const ARROW_SCROLL_DISTANCE = 340;

// testimonialHomeCard flex-basis (340px) + .testimonialsHomeTrack gap
// (--space-lg, 24px) — the pixel distance between one card's left edge
// and the next. Used to translate scrollLeft into a testimonial index
// for the dot indicators, and to scroll to a specific dot on click.
const ITEM_PITCH = 364;

function TestimonialCard({ testimonial }: { testimonial: HomeTestimonial }) {
  return (
    <article className="testimonialHomeCard">
      <div className="testimonialHomeStars" aria-label={`${testimonial.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            strokeWidth={0}
            fill="currentColor"
            className={i < testimonial.rating ? "testimonialHomeStarFilled" : "testimonialHomeStarEmpty"}
            aria-hidden="true"
          />
        ))}
      </div>

      <p className="testimonialHomeQuote">&ldquo;{testimonial.quote}&rdquo;</p>

      <div className="testimonialHomeFooter">
        <div className="testimonialHomeAvatar" aria-hidden="true">
          {testimonial.authorInitials}
        </div>
        <div className="testimonialHomeAuthor">
          <span className="testimonialHomeAuthorName">{testimonial.authorName}</span>
          <span className="testimonialHomeAuthorRole">{testimonial.authorRole}</span>
        </div>
        <span className="testimonialHomeCategoryBadge">{testimonial.categoryLabel}</span>
      </div>
    </article>
  );
}

export default function TestimonialsSection() {
  // Auto-scroll only applies at tablet width and up — on mobile the
  // section renders as a plain vertical stack (see isDesktop below).
  const [isDesktop, setIsDesktop] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const applyMatch = () => setIsDesktop(query.matches);
    applyMatch();
    query.addEventListener("change", applyMatch);
    return () => query.removeEventListener("change", applyMatch);
  }, []);

  // Auto-scroll loop, seeded at the halfway point and counting DOWN so
  // the strip visibly moves right-to-left (opposite of Featured
  // Products, which counts scrollLeft up) — matches the spec's
  // "auto-scroll right" direction for this section. Resets back to the
  // halfway point once it reaches 0, where the duplicated items line
  // back up with the originals.
  useEffect(() => {
    if (!isDesktop || isPaused || prefersReducedMotion) return;
    const track = trackRef.current;
    if (!track) return;

    if (track.scrollLeft === 0) {
      track.scrollLeft = track.scrollWidth / 2;
    }

    let animationFrameId: number;
    const pixelsPerSecond = track.scrollWidth / 2 / 18; // full pass in 18s

    let lastTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      track.scrollLeft -= pixelsPerSecond * deltaSeconds;
      if (track.scrollLeft <= 0) {
        track.scrollLeft += track.scrollWidth / 2;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDesktop, isPaused, prefersReducedMotion]);

  // Screen-reader-only status text, updated only on manual arrow
  // navigation (not on every auto-scroll animation frame — announcing
  // continuous pixel movement would be unusable noise for SR users).
  const [srStatus, setSrStatus] = useState("");

  function scrollByArrow(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * ARROW_SCROLL_DISTANCE, behavior: "smooth" });
    setSrStatus(direction === 1 ? "Showing next testimonials." : "Showing previous testimonials.");
  }

  // Dot indicators (spec 3.12: "Navigation arrows + dot indicators").
  // activeIndex tracks whichever original testimonial currently sits at
  // the track's leading edge, derived straight from scrollLeft — so it
  // stays correct whether the movement came from the auto-scroll loop,
  // an arrow click, a dot click, or manual touch/trackpad scrolling.
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isDesktop) return;
    const track = trackRef.current;
    if (!track) return;

    let frameId: number | null = null;
    const updateActiveIndex = () => {
      frameId = null;
      const halfWidth = track.scrollWidth / 2;
      if (!halfWidth) return;
      // Normalize into [0, halfWidth) first — scrollLeft can briefly sit
      // just outside that range for a frame right as the loop wraps.
      const positionInSet = ((track.scrollLeft % halfWidth) + halfWidth) % halfWidth;
      const nextIndex = Math.round(positionInSet / ITEM_PITCH) % HOME_TESTIMONIALS.length;
      setActiveIndex(nextIndex);
    };

    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(updateActiveIndex);
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    updateActiveIndex();
    return () => {
      track.removeEventListener("scroll", handleScroll);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [isDesktop]);

  function scrollToIndex(index: number) {
    trackRef.current?.scrollTo({ left: index * ITEM_PITCH, behavior: "smooth" });
    setSrStatus(`Showing testimonial ${index + 1} of ${HOME_TESTIMONIALS.length}.`);
  }

  /**
   * handleCarouselKeyDown
   * ArrowLeft/ArrowRight scroll the carousel one card-width, same as
   * clicking the prev/next arrow buttons — spec 7.3: "Arrow keys
   * navigate carousel on desktop (manual, not auto-play during
   * keyboard nav)". Only wired on desktop, where the arrow buttons,
   * dots, and auto-scroll track exist; mobile renders a plain stack.
   */
  function handleCarouselKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!isDesktop) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByArrow(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByArrow(-1);
    }
  }

  return (
    <section id="testimonials-section" className="testimonialsHomeSection">
      <motion.div
        className="testimonialsHomeContainer"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="testimonialsHomeHeader">
          <p className="eyebrow">Testimonials</p>
          <h2 className="sectionTitle">What our creators say</h2>
        </div>

        <div
          className="testimonialsHomeCarousel"
          role="region"
          aria-label="Testimonials carousel"
          tabIndex={isDesktop ? 0 : undefined}
          onKeyDown={handleCarouselKeyDown}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          {/* Announces manual navigation only — see srStatus comment above. */}
          <span className="srOnly" role="status" aria-live="polite">
            {srStatus}
          </span>

          {isDesktop ? (
            <>
              <div className="testimonialsHomeTrack" ref={trackRef}>
                {LOOP_TESTIMONIALS.map((testimonial, index) => (
                  <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} />
                ))}
              </div>

              <button
                type="button"
                className="testimonialsHomeArrow testimonialsHomeArrowPrev"
                aria-label="Scroll testimonials left"
                onClick={() => scrollByArrow(-1)}
              >
                <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="testimonialsHomeArrow testimonialsHomeArrowNext"
                aria-label="Scroll testimonials right"
                onClick={() => scrollByArrow(1)}
              >
                <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
              </button>

              <div className="testimonialsHomeDots" role="tablist" aria-label="Testimonial slides">
                {HOME_TESTIMONIALS.map((testimonial, index) => (
                  <button
                    key={testimonial.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={`Show testimonial from ${testimonial.authorName}`}
                    className={`testimonialsHomeDot${
                      index === activeIndex ? " testimonialsHomeDotActive" : ""
                    }`}
                    onClick={() => scrollToIndex(index)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="testimonialsHomeStack">
              {HOME_TESTIMONIALS.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
