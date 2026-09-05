/**
 * FILE: lib/hooks/useBuyerProfile.ts
 * PURPOSE:
 * Client-side data fetching and mutation for /buyer/profile
 * (buyer_account_specification.md Section 4.2). Owns the
 * loading/error states (Rule 25) for the initial fetch; save and
 * avatar-upload each report their own success/message so the caller
 * can show the right toast without duplicating error text.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface BuyerProfile {
  fullName: string;
  displayName: string;
  phone: string;
  avatarUrl: string | null;
  email: string;
  createdAt: string;
}

interface FetchState {
  profile: BuyerProfile | null;
  isLoading: boolean;
  error: string | null;
}

export function useBuyerProfile() {
  const [state, setState] = useState<FetchState>({ profile: null, isLoading: true, error: null });

  const fetchProfile = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/buyer/profile");
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

  const saveProfile = useCallback(
    async (fields: { fullName: string; displayName: string; phone: string }) => {
      try {
        const response = await fetch("/api/buyer/profile", {
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
    },
    []
  );

  const uploadAvatar = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/buyer/profile/avatar", {
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

  return { ...state, refetch: fetchProfile, saveProfile, uploadAvatar };
}
