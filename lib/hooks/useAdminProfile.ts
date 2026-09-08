/**
 * FILE: lib/hooks/useAdminProfile.ts
 * PURPOSE:
 * Client-side data fetching and mutation for /admin/profile
 * (admin_account_specification.md Section 3.8, task-44 UI half).
 * Mirrors lib/hooks/useBuyerProfile.ts's shape and error-handling
 * pattern, extended with the admin-only pieces the buyer hook has no
 * equivalent for: role/permissions (read-only), a separate
 * changePassword mutation (requires current-password re-entry, unlike
 * a plain profile save), and per-key notification preference saves
 * (each toggle saves immediately, per the spec — no batch save).
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface AdminNotificationPrefs {
  newOrder: boolean;
  lowStock: boolean;
  weeklySummary: boolean;
}

export interface AdminProfile {
  fullName: string;
  avatarUrl: string | null;
  email: string;
  role: string;
  permissions: string[];
  createdAt: string;
  notificationPrefs: AdminNotificationPrefs;
}

interface FetchState {
  profile: AdminProfile | null;
  isLoading: boolean;
  error: string | null;
}

interface MutationResult {
  success: boolean;
  message: string;
}

export function useAdminProfile() {
  const [state, setState] = useState<FetchState>({ profile: null, isLoading: true, error: null });

  const fetchProfile = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/admin/profile");
      const result = await response.json();

      if (!result.success) {
        setState({ profile: null, isLoading: false, error: result.message });
        return;
      }
      setState({ profile: result.data, isLoading: false, error: null });
    } catch {
      setState({
        profile: null,
        isLoading: false,
        error: "We couldn't reach the server. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(async (fields: { fullName: string }): Promise<MutationResult> => {
    try {
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(fields),
      });
      const result = await response.json();

      if (!result.success) return { success: false, message: result.message as string };

      setState((current) =>
        current.profile ? { ...current, profile: { ...current.profile, ...fields } } : current
      );
      return { success: true, message: "" };
    } catch {
      return { success: false, message: "We couldn't save your changes. Please try again in a moment." };
    }
  }, []);

  const uploadAvatar = useCallback(async (file: File): Promise<MutationResult> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/profile/avatar", {
        method: "POST",
        headers: getCsrfHeader(),
        body: formData,
      });
      const result = await response.json();

      if (!result.success) return { success: false, message: result.message as string };

      setState((current) =>
        current.profile ? { ...current, profile: { ...current.profile, avatarUrl: result.data.avatarUrl } } : current
      );
      return { success: true, message: "" };
    } catch {
      return { success: false, message: "Avatar upload failed. Please try again." };
    }
  }, []);

  /**
   * changePassword
   * Separate from saveProfile — requires current-password re-entry
   * (Rule 6, mirrored server-side by app/api/admin/profile/password/route.ts).
   * Never updates local profile state — password isn't part of the
   * displayed profile fields.
   */
  const changePassword = useCallback(
    async (fields: { currentPassword: string; newPassword: string; confirmNewPassword: string }): Promise<MutationResult> => {
      try {
        const response = await fetch("/api/admin/profile/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify(fields),
        });
        const result = await response.json();

        if (!result.success) return { success: false, message: result.message as string };
        return { success: true, message: "" };
      } catch {
        return { success: false, message: "We couldn't update your password. Please try again." };
      }
    },
    []
  );

  /**
   * saveNotificationPref
   * Fires on every toggle flip (no batch "Save" button per the spec).
   * Updates local state optimistically-on-success only — if the save
   * fails, the toggle's visual state is left to the caller to revert.
   */
  const saveNotificationPref = useCallback(
    async (key: keyof AdminNotificationPrefs, value: boolean): Promise<MutationResult> => {
      try {
        const response = await fetch("/api/admin/profile/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getCsrfHeader() },
          body: JSON.stringify({ key, value }),
        });
        const result = await response.json();

        if (!result.success) return { success: false, message: result.message as string };

        setState((current) =>
          current.profile
            ? { ...current, profile: { ...current.profile, notificationPrefs: { ...current.profile.notificationPrefs, [key]: value } } }
            : current
        );
        return { success: true, message: "" };
      } catch {
        return { success: false, message: "We couldn't save that preference. Please try again." };
      }
    },
    []
  );

  return { ...state, refetch: fetchProfile, saveProfile, uploadAvatar, changePassword, saveNotificationPref };
}
