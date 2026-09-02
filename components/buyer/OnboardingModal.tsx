/**
 * FILE: components/buyer/OnboardingModal.tsx
 * ROLE: Buyer only — mounted inside app/buyer/dashboard/page.tsx.
 *
 * PURPOSE:
 * Shows the first-time buyer onboarding overlay described in
 * login_and_registration_page.md Section 10, immediately after a
 * successful registration. RegisterForm.tsx sets a one-shot session
 * flag right before it navigates to /buyer/dashboard; this component
 * checks for that flag on mount, shows the modal if present, and
 * clears the flag so it never reappears on a later visit (refresh,
 * revisit, or a normal sign-in) — even if the buyer navigates away
 * before dismissing it.
 *
 * There is no Settings page yet to host a "skip onboarding" toggle
 * (Section 10 mentions one), so for now dismissing the modal here is
 * the only skip path — revisit this component once Settings exists.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Session-only — this is a one-time "just registered" signal, not a
// durable preference, so sessionStorage (cleared on tab close) is the
// right scope. Never localStorage: this must not persist across tabs
// or survive a normal returning-buyer sign-in later.
const ONBOARDING_FLAG_KEY = "mtwOnboarding:justRegistered";

const CHECKLIST_ITEMS = [
  "Complete your profile",
  "Browse templates",
  "Add payment method",
  "Explore tutorials",
];

export default function OnboardingModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Runs once on mount — reads the flag RegisterForm.tsx set just
  // before redirecting here, then immediately clears it so a page
  // refresh or a later normal login never re-triggers the modal.
  useEffect(() => {
    const shouldShow = sessionStorage.getItem(ONBOARDING_FLAG_KEY) === "true";
    if (shouldShow) {
      sessionStorage.removeItem(ONBOARDING_FLAG_KEY);
      setIsOpen(true);
    }
  }, []);

  function handleClose() {
    setIsOpen(false);
  }

  function handleGetStarted() {
    setIsOpen(false);
    router.push("/buyer/dashboard");
  }

  if (!isOpen) return null;

  return (
    <div className="onboardingModalBackdrop" role="presentation" onClick={handleClose}>
      <div
        className="onboardingModalDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboardingModalTitle"
        // Stop the backdrop's onClick from also firing when the click
        // originated inside the dialog itself.
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="onboardingModalDismiss"
          onClick={handleClose}
          aria-label="Dismiss"
        >
          ×
        </button>

        <h2 id="onboardingModalTitle" className="onboardingModalTitle">
          Welcome to Matthew Studio Marketplace!
        </h2>
        <p className="onboardingModalSubtitle">
          A few things worth doing when you get a chance:
        </p>

        <ul className="onboardingModalChecklist">
          {CHECKLIST_ITEMS.map((item) => (
            <li key={item} className="onboardingModalChecklistItem">
              <span className="onboardingModalChecklistBox" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <button type="button" className="onboardingModalPrimaryButton" onClick={handleGetStarted}>
          Get started
        </button>
      </div>
    </div>
  );
}
