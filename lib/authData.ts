/**
 * FILE: lib/authData.ts
 * PURPOSE:
 * Static content for the /auth/login page — the background slideshow
 * slide list (Mockup 2: full-bleed cross-fading photos behind the
 * glass card) and password validation copy shared between the client
 * form and the API route.
 */

export interface AuthBackgroundSlide {
  id: string;
  imageSrc: string;
  alt: string;
}

// Replace these paths with real studio photography before launch —
// files live under public/images/auth/.
export const AUTH_BACKGROUND_SLIDES: AuthBackgroundSlide[] = [
  { id: "slide-1", imageSrc: "/images/auth/slide-1.jpg", alt: "Matthew Studio workspace" },
  { id: "slide-2", imageSrc: "/images/auth/slide-2.jpg", alt: "Template preview on screen" },
  { id: "slide-3", imageSrc: "/images/auth/slide-3.jpg", alt: "Creator reviewing a project" },
];

// Milliseconds each slide stays on screen before cross-fading to the next.
export const AUTH_BACKGROUND_SLIDE_INTERVAL_MS = 4500;

// Shared password rule text — used for both the strength meter hint
// and the inline validation error on the register form.
export const PASSWORD_REQUIREMENTS_HINT =
  "At least 8 characters, with 1 uppercase letter, 1 number, and 1 special character.";
