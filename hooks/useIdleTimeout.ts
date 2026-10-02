/**
 * FILE: hooks/useIdleTimeout.ts
 * PURPOSE:
 * Detects a signed-in user going idle (Rule 32.5) and calls onIdle once
 * after the chosen number of minutes with no activity. Used by
 * components/shared/IdleSessionGuard.tsx, which each account layout
 * (buyer, admin, superAdmin) renders.
 *
 * DATA FLOW:
 * 1. Mount: the last-activity time is set to "now" and one timer starts.
 * 2. Every activity event only writes a new last-activity time — it does
 *    not restart the timer, so a constantly firing mousemove stays cheap.
 * 3. When the timer fires it compares "now" with the last-activity time.
 *    Not idle yet → it sleeps again for only the remaining time. Idle
 *    long enough → onIdle runs one time and the listeners are removed.
 * 4. Tab becoming visible again runs the same check straight away, so a
 *    device that slept past the deadline is logged out on wake instead
 *    of waiting for a throttled timer.
 */
"use client";

import { useEffect, useRef } from "react";

// Signals that a human is really using the page. Keyboard-only and touch
// users are covered on purpose — mousemove alone would miss them.
const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export function useIdleTimeout(onIdle: () => void, idleMinutes: number = 30) {
  // Always call the newest onIdle without restarting the timer when the
  // caller passes a new function on re-render.
  const onIdleRef = useRef(onIdle);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    const idleDurationMs = idleMinutes * 60 * 1000;
    let lastActivityAt = Date.now();
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let hasFired = false;

    // Records activity only. Cheaper than clearing and re-creating a
    // timer on every mouse movement.
    function handleActivity() {
      lastActivityAt = Date.now();
    }

    // Decides whether the user is idle yet. Called when the timer fires
    // and when the tab becomes visible again after sleep or a tab switch.
    function checkIdle() {
      if (hasFired) return;

      const idleForMs = Date.now() - lastActivityAt;

      if (idleForMs >= idleDurationMs) {
        // Fire only once per mount so a slow logout request can't be
        // started twice.
        hasFired = true;
        stopListening();
        onIdleRef.current();
        return;
      }

      // Activity happened since the timer started — wait only for the
      // time that is still left.
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(checkIdle, idleDurationMs - idleForMs);
    }

    // The tab was hidden or the device slept: timers may have been
    // throttled or paused, so re-check against the real clock.
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") checkIdle();
    }

    function stopListening() {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity, true)
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (idleTimer) clearTimeout(idleTimer);
    }

    // Capture phase so scrolling inside any inner container counts too —
    // scroll events do not bubble up to window.
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { capture: true, passive: true })
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // The user just loaded the area, so the countdown starts immediately.
    idleTimer = setTimeout(checkIdle, idleDurationMs);

    return stopListening;
  }, [idleMinutes]);
}
