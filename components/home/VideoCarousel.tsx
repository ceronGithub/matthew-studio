/**
 * FILE: components/home/VideoCarousel.tsx
 * ROLE: Public — reusable video demo carousel for the Templates
 * section's "Demo" block and the AI Videos section's video carousel
 * (IMPROVEMENTS.md Section 4A / Section 11 file structure comment).
 *
 * PURPOSE:
 * Shows one video at a time with prev/next arrow navigation and
 * touch-swipe support (Section 5, Touch interactions). The active
 * video is muted, has no autoplay-on-mount, and only plays once 60%+
 * of it is visible in the viewport — pausing again the moment it
 * scrolls away (Section 3, Video autoplay behavior). Loop is
 * disabled; playback controls are the browser's native <video>
 * controls, which already cover play/pause/volume/progress and are
 * more accessible than a hand-rolled control bar.
 *
 * DATA FLOW:
 * No data fetching — receives `videos` via props. Each item's `src`
 * should point to a hosted video file or Cloudflare Stream URL
 * (Section 7, Video optimization) once real demo videos exist.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface VideoCarouselItem {
  id: string;
  title: string;
  src: string;
  poster?: string;
  /** Path to a WebVTT (.vtt) captions file for this video. Rendered as
   * a <track kind="captions"> so the player is accessible without
   * relying on the video's own audio (Section 13 accessibility
   * checklist: "Videos have captions"). Optional so callers without a
   * captions file yet (no real videos exist in this project either)
   * still render a working, uncaptioned player. */
  captionsSrc?: string;
}

interface VideoCarouselProps {
  videos: VideoCarouselItem[];
}

const SWIPE_THRESHOLD_PX = 50;

export default function VideoCarousel({ videos }: VideoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef(0);

  function goTo(index: number) {
    setActiveIndex(((index % videos.length) + videos.length) % videos.length);
  }

  // Plays the active video only once 60%+ of it is visible in the
  // viewport, and pauses it the instant that drops below threshold —
  // prevents videos autoplaying off-screen or fighting for attention
  // with other page content.
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          videoElement.play().catch(() => {
            // Autoplay can be blocked by the browser even when muted in
            // rare cases — this is a non-critical enhancement, so fail silently.
          });
        } else {
          videoElement.pause();
        }
      },
      { threshold: [0, 0.6, 1] }
    );

    observer.observe(videoElement);
    return () => observer.disconnect();
  }, [activeIndex]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const distance = touchStartX.current - event.changedTouches[0].clientX;
    if (distance > SWIPE_THRESHOLD_PX) goTo(activeIndex + 1); // swiped left → next
    if (distance < -SWIPE_THRESHOLD_PX) goTo(activeIndex - 1); // swiped right → prev
  }

  const activeVideo = videos[activeIndex];
  if (!activeVideo) return null;

  return (
    <div className="videoCarousel">
      <div className="videoCarouselStage" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <video
          key={activeVideo.id}
          ref={videoRef}
          className="videoCarouselPlayer"
          src={activeVideo.src}
          poster={activeVideo.poster}
          muted
          playsInline
          loop={false}
          controls
        >
          {activeVideo.captionsSrc && (
            <track
              kind="captions"
              src={activeVideo.captionsSrc}
              srcLang="en"
              label="English"
              default
            />
          )}
        </video>

        {videos.length > 1 && (
          <>
            <button
              type="button"
              className="videoCarouselArrow videoCarouselArrowPrev"
              aria-label="Previous video"
              onClick={() => goTo(activeIndex - 1)}
            >
              <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="videoCarouselArrow videoCarouselArrowNext"
              aria-label="Next video"
              onClick={() => goTo(activeIndex + 1)}
            >
              <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <p className="videoCarouselCaption">{activeVideo.title}</p>

      {videos.length > 1 && (
        <div className="videoCarouselDots" role="tablist" aria-label="Video demos">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Show ${video.title}`}
              className={index === activeIndex ? "videoCarouselDot videoCarouselDotActive" : "videoCarouselDot"}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
