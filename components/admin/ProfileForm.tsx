/**
 * FILE: components/admin/ProfileForm.tsx
 * ROLE: Admin/super-admin only — rendered inside app/admin/profile/page.tsx.
 *
 * PURPOSE:
 * admin_account_specification.md Section 3.8 (task-44, UI half).
 * Three independent sections, each with its own submit/save action:
 *   1. Profile Information — full name (editable), avatar upload,
 *      email/role/permissions (read-only)
 *   2. Change Password — separate form, requires current password
 *      re-entry (Rule 6), server revokes other sessions on success
 *   3. Notification Preferences — each toggle saves immediately, no
 *      batch "Save" button (per the spec)
 * Follows the same manual useState + validate() pattern as
 * components/buyer/ProfileForm.tsx and components/auth/RegisterForm.tsx
 * (Rule 34.3: autofocus first field, inline validation, disabled-submit-
 * while-saving) — this project doesn't use React Hook Form anywhere,
 * so this mirrors the established convention.
 */
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { UserRound, Loader2, PackageOpen, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAdminProfile, type AdminNotificationPrefs } from "@/lib/hooks/useAdminProfile";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";

// Same forbidden-character first line of defense as RegisterForm.tsx and
// buyer ProfileForm.tsx (Rule 18.1). Never applied to password fields —
// those need to accept the special characters the strength policy requires.
const FORBIDDEN_CHARACTERS = /[<>{}[\]/\\;'"`=]/g;

const NOTIFICATION_TOGGLES: { key: keyof AdminNotificationPrefs; label: string }[] = [
  { key: "newOrder", label: "Email me when a new order is placed" },
  { key: "lowStock", label: "Email me when inventory/stock is low" },
  { key: "weeklySummary", label: "Email me a weekly activity summary" },
];

function formatCreatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatRoleLabel(role: string): string {
  return role === "superAdmin" ? "Super Admin" : "Admin";
}

/**
 * isPasswordStrongEnough
 * Mirrors app/api/admin/profile/password/route.ts's server-side check —
 * this is a UX-level pre-check only (Rule 18's "backend validation is
 * still required separately" note); the server re-validates regardless.
 */
function isPasswordStrongEnough(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export default function ProfileForm() {
  const { profile, isLoading, error, refetch, saveProfile, uploadAvatar, changePassword, saveNotificationPref } =
    useAdminProfile();
  const { toasts, showToast, dismissToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Profile Information state ---
  const [fullName, setFullName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // --- Change Password state ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // --- Notification Preferences state — tracks which single toggle is
  // mid-save so only that switch shows a disabled/pending state, never
  // the whole section.
  const [savingPrefKey, setSavingPrefKey] = useState<keyof AdminNotificationPrefs | null>(null);

  // Populate local field state once the profile has loaded — never
  // overwrite what the admin is actively typing on a later refetch.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
  }, [profile]);

  function validateProfile(): boolean {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateProfile() || isSubmittingProfile) return;

    setIsSubmittingProfile(true);
    const result = await saveProfile({ fullName: fullName.trim().replace(FORBIDDEN_CHARACTERS, "") });
    setIsSubmittingProfile(false);

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

  function validatePassword(): boolean {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = "Enter your current password.";
    if (!isPasswordStrongEnough(newPassword)) {
      errors.newPassword = "Must be 8+ characters with an uppercase letter, a number, and a special character.";
    }
    if (newPassword !== confirmNewPassword) errors.confirmNewPassword = "New passwords do not match.";
    setPasswordFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validatePassword() || isSubmittingPassword) return;

    setIsSubmittingPassword(true);
    const result = await changePassword({ currentPassword, newPassword, confirmNewPassword });
    setIsSubmittingPassword(false);

    if (!result.success) {
      showToast(`✕ ${result.message}`, "error");
      return;
    }
    showToast("✓ Password updated successfully.", "success");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordFieldErrors({});
  }

  async function handleToggleChange(key: keyof AdminNotificationPrefs, nextValue: boolean) {
    setSavingPrefKey(key);
    const result = await saveNotificationPref(key, nextValue);
    setSavingPrefKey(null);

    if (!result.success) {
      showToast(`✕ ${result.message}`, "error");
      return;
    }
    showToast("✓ Preference saved.", "success");
  }

  if (isLoading) {
    return (
      <div className="adminProfileCard">
        <div className="adminProfileSkeletonAvatar skeletonBlock" />
        <div className="adminProfileSkeletonLine skeletonBlock" />
        <div className="adminProfileSkeletonLine skeletonBlock" />
        <div className="adminProfileSkeletonLine skeletonBlock adminProfileSkeletonLine--short" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="adminProfileEmptyState">
        <PackageOpen size={32} />
        <p>{error ?? "We couldn't load your profile."}</p>
        <button type="button" className="adminProfileRetryButton" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="adminProfileSections">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* --- Section 1: Profile Information --- */}
      <section className="adminProfileCard">
        <h2 className="adminProfileSectionTitle">Profile Information</h2>

        <div className="adminProfileAvatarRow">
          <button
            type="button"
            className="adminProfileAvatarButton"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            aria-label="Change profile photo"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- small fixed-ratio avatar, next/image not needed here
              <img src={profile.avatarUrl} alt="Your profile photo" className="adminProfileAvatarImage" />
            ) : (
              <UserRound size={28} />
            )}
            {isUploadingAvatar && (
              <span className="adminProfileAvatarOverlay">
                <Loader2 size={18} className="adminProfileSpin" />
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
          <p className="adminProfileAvatarHint">Click to change photo</p>
        </div>

        <form onSubmit={handleProfileSubmit} className="adminProfileForm" noValidate>
          <div className="adminProfileField">
            <label htmlFor="adminProfileFullName">Full name</label>
            <input
              id="adminProfileFullName"
              type="text"
              autoFocus
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            {fieldErrors.fullName && <span className="adminProfileFieldError">{fieldErrors.fullName}</span>}
          </div>

          <div className="adminProfileField">
            <label htmlFor="adminProfileEmail">Email</label>
            <input id="adminProfileEmail" type="email" value={profile.email} disabled />
          </div>

          <div className="adminProfileField">
            <span className="adminProfileRoleLabel">Role</span>
            <span className="adminProfileRoleBadge">
              <ShieldCheck size={14} />
              {formatRoleLabel(profile.role)}
            </span>
          </div>

          <div className="adminProfileField">
            <span className="adminProfileRoleLabel">Permissions</span>
            {profile.role === "superAdmin" ? (
              <p className="adminProfilePermissionsNote">Full access — not permission-gated.</p>
            ) : profile.permissions.length === 0 ? (
              <p className="adminProfilePermissionsNote">No permissions assigned yet.</p>
            ) : (
              <ul className="adminProfilePermissionsList">
                {profile.permissions.map((permission) => (
                  <li key={permission} className="adminProfilePermissionChip">
                    {permission}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="adminProfileCreatedAt">Account created {formatCreatedDate(profile.createdAt)}</p>

          <button type="submit" className="adminProfileSaveButton" disabled={isSubmittingProfile}>
            {isSubmittingProfile ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </section>

      {/* --- Section 2: Change Password --- */}
      <section className="adminProfileCard">
        <h2 className="adminProfileSectionTitle">Change Password</h2>

        <form onSubmit={handlePasswordSubmit} className="adminProfileForm" noValidate>
          <div className="adminProfileField">
            <label htmlFor="adminProfileCurrentPassword">Current password</label>
            <div className="adminProfilePasswordWrapper">
              <input
                id="adminProfileCurrentPassword"
                type={isPasswordVisible ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <button
                type="button"
                className="adminProfilePasswordToggle"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              >
                {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordFieldErrors.currentPassword && (
              <span className="adminProfileFieldError">{passwordFieldErrors.currentPassword}</span>
            )}
          </div>

          <div className="adminProfileField">
            <label htmlFor="adminProfileNewPassword">New password</label>
            <input
              id="adminProfileNewPassword"
              type={isPasswordVisible ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {passwordFieldErrors.newPassword && (
              <span className="adminProfileFieldError">{passwordFieldErrors.newPassword}</span>
            )}
          </div>

          <div className="adminProfileField">
            <label htmlFor="adminProfileConfirmNewPassword">Confirm new password</label>
            <input
              id="adminProfileConfirmNewPassword"
              type={isPasswordVisible ? "text" : "password"}
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
            />
            {passwordFieldErrors.confirmNewPassword && (
              <span className="adminProfileFieldError">{passwordFieldErrors.confirmNewPassword}</span>
            )}
          </div>

          <button type="submit" className="adminProfileSaveButton" disabled={isSubmittingPassword}>
            {isSubmittingPassword ? "Updating…" : "Update Password"}
          </button>
        </form>
      </section>

      {/* --- Section 3: Notification Preferences --- */}
      <section className="adminProfileCard">
        <h2 className="adminProfileSectionTitle">Notification Preferences</h2>

        <div className="adminProfileToggleList">
          {NOTIFICATION_TOGGLES.map(({ key, label }) => (
            <label key={key} className="adminProfileToggleRow">
              <span>{label}</span>
              <span className="adminProfileSwitch">
                <input
                  type="checkbox"
                  checked={profile.notificationPrefs[key]}
                  disabled={savingPrefKey === key}
                  onChange={(event) => handleToggleChange(key, event.target.checked)}
                />
                <span className="adminProfileSwitchTrack">
                  <span className="adminProfileSwitchThumb" />
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
