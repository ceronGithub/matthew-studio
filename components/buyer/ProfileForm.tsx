/**
 * FILE: components/buyer/ProfileForm.tsx
 * ROLE: Buyer only — rendered inside app/buyer/profile/page.tsx.
 *
 * PURPOSE:
 * buyer_account_specification.md Section 4.2. Editable: full name,
 * display name, phone, avatar. Read-only: email, account created
 * date. Follows the same manual useState + validate() pattern already
 * used by components/auth/RegisterForm.tsx (Rule 34.3: autofocus
 * first field, inline validation, disabled-submit-while-saving) —
 * this project doesn't use React Hook Form anywhere yet, so this
 * mirrors the established convention rather than introducing a new
 * one for a single form.
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { UserRound, Loader2, PackageOpen } from "lucide-react";
import { useBuyerProfile } from "@/lib/hooks/useBuyerProfile";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

// Same forbidden-character first line of defense as RegisterForm.tsx (Rule 18.1).
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

function formatCreatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function ProfileForm() {
  const { profile, isLoading, error, refetch, saveProfile, uploadAvatar } = useBuyerProfile();
  const { toasts, showToast, dismissToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Populate local field state once the profile has loaded — never
  // overwrite what the buyer is actively typing on a later refetch.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setDisplayName(profile.displayName);
    setPhone(profile.phone);
  }, [profile]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    if (displayName.trim().length < 1) errors.displayName = "Enter a display name.";
    if (phone && !/^[0-9+()\-.\s]{7,20}$/.test(phone)) errors.phone = "Enter a valid phone number.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await saveProfile({
      fullName: fullName.trim().replace(FORBIDDEN_CHARACTERS, ""),
      displayName: displayName.trim().replace(FORBIDDEN_CHARACTERS, ""),
      phone: phone.trim().replace(FORBIDDEN_CHARACTERS, ""),
    });
    setIsSubmitting(false);

    if (!result.success) {
      showToast(`✕ ${result.message}`, "error");
      return;
    }
    showToast("✓ Profile updated successfully.", "success");
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const result = await uploadAvatar(file);
    setIsUploadingAvatar(false);
    event.target.value = ""; // Allow re-selecting the same file next time

    if (!result.success) {
      showToast(`✕ ${result.message}`, "error");
      return;
    }
    showToast("✓ Profile photo updated.", "success");
  }

  if (isLoading) {
    return (
      <div className="buyerProfileCard">
        <div className="buyerProfileSkeletonAvatar skeletonBlock" />
        <div className="buyerProfileSkeletonLine skeletonBlock" />
        <div className="buyerProfileSkeletonLine skeletonBlock" />
        <div className="buyerProfileSkeletonLine skeletonBlock buyerProfileSkeletonLine--short" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="buyerProfileEmptyState">
        <PackageOpen size={32} />
        <p>{error ?? "We couldn't load your profile."}</p>
        <button type="button" className="buyerProfileRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="buyerProfileCard">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="buyerProfileAvatarRow">
        <button
          type="button"
          className="buyerProfileAvatarButton"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAvatar}
          aria-label="Change profile photo"
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small fixed-ratio avatar, next/image not needed here
            <img src={profile.avatarUrl} alt="Your profile photo" className="buyerProfileAvatarImage" />
          ) : (
            <UserRound size={28} />
          )}
          {isUploadingAvatar && (
            <span className="buyerProfileAvatarOverlay">
              <Loader2 size={18} className="buyerProfileSpin" />
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          className="srOnly"
        />
        <p className="buyerProfileAvatarHint">Click to change photo</p>
      </div>

      <form onSubmit={handleSubmit} className="buyerProfileForm" noValidate>
        <div className="buyerProfileField">
          <label htmlFor="profileFullName">Full name</label>
          <input
            id="profileFullName"
            type="text"
            autoFocus
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          {fieldErrors.fullName && <span className="buyerProfileFieldError">{fieldErrors.fullName}</span>}
        </div>

        <div className="buyerProfileField">
          <label htmlFor="profileDisplayName">Display name</label>
          <input
            id="profileDisplayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          {fieldErrors.displayName && <span className="buyerProfileFieldError">{fieldErrors.displayName}</span>}
        </div>

        <div className="buyerProfileField">
          <label htmlFor="profilePhone">Phone</label>
          <input
            id="profilePhone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+63 900 000 0000"
          />
          {fieldErrors.phone && <span className="buyerProfileFieldError">{fieldErrors.phone}</span>}
        </div>

        <div className="buyerProfileField">
          <label htmlFor="profileEmail">Email</label>
          <input id="profileEmail" type="email" value={profile.email} disabled />
        </div>

        <p className="buyerProfileCreatedAt">Account created {formatCreatedDate(profile.createdAt)}</p>

        <button type="submit" className="buyerProfileSaveButton" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
