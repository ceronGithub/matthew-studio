/**
 * FILE: lib/hooks/useTotpEnrollment.ts
 * PURPOSE:
 * Client-side data fetching and mutation for the TOTP enrollment screen
 * (task-47-ui-totp-enrollment, part 4 of 6 for 2FA/TOTP,
 * super_admin_account_specification.md Section 12 Phase 1). Talks to
 * the single-endpoint API built in task-47-api-totp-enroll
 * (GET status / POST generate / POST verify at /api/auth/totp/enroll —
 * note this lives under /api/auth/*, not /api/admin/*, per that task's
 * routing note). Mirrors lib/hooks/useAdminProfile.ts's fetch-state +
 * mutation-result shape and error-handling convention.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { getCsrfHeader } from "@/lib/csrf";

export interface TotpStatus {
  enabled: boolean;
  enrolledAt: string | null;
  lastVerifiedAt: string | null;
}

export interface TotpEnrollmentData {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
}

interface FetchState {
  status: TotpStatus | null;
  isLoading: boolean;
  error: string | null;
}

interface MutationResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const NETWORK_ERROR_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

export function useTotpEnrollment() {
  const [state, setState] = useState<FetchState>({ status: null, isLoading: true, error: null });

  /**
   * fetchStatus
   * Retrieves whether the calling admin/superAdmin already has TOTP
   * enabled. Used on mount to decide whether to show the QR/enroll
   * flow or the "already enabled" state, per Rule 25's three required
   * states (loading/empty/error) for any data-fetched view.
   */
  const fetchStatus = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/auth/totp/enroll");
      const result = await response.json();

      if (!result.success) {
        setState({ status: null, isLoading: false, error: result.message as string });
        return;
      }
      setState({ status: result.data as TotpStatus, isLoading: false, error: null });
    } catch {
      setState({ status: null, isLoading: false, error: NETWORK_ERROR_MESSAGE });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /**
   * generate
   * Issues a fresh secret + QR code for the calling account. The API
   * refuses (409) if TOTP is already enabled — the caller surfaces
   * that message as-is (Rule 34.1: backend message is the source of
   * truth, frontend displays it verbatim).
   */
  const generate = useCallback(async (): Promise<MutationResult<TotpEnrollmentData>> => {
    try {
      const response = await fetch("/api/auth/totp/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ action: "generate" }),
      });
      const result = await response.json();

      if (!result.success) return { success: false, message: result.message as string };
      return { success: true, message: result.message as string, data: result.data as TotpEnrollmentData };
    } catch {
      return { success: false, message: NETWORK_ERROR_MESSAGE };
    }
  }, []);

  /**
   * verify
   * Submits the 6-digit code the admin typed in from their
   * authenticator app. On success, updates local status so the UI can
   * immediately switch to the "enabled" state without a full refetch.
   */
  const verify = useCallback(async (code: string): Promise<MutationResult> => {
    try {
      const response = await fetch("/api/auth/totp/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ action: "verify", code }),
      });
      const result = await response.json();

      if (!result.success) return { success: false, message: result.message as string };

      setState((current) => ({
        status: {
          enabled: true,
          enrolledAt: (result.data?.enrolledAt as string | undefined) ?? new Date().toISOString(),
          lastVerifiedAt: current.status?.lastVerifiedAt ?? null,
        },
        isLoading: false,
        error: null,
      }));

      return { success: true, message: result.message as string };
    } catch {
      return { success: false, message: NETWORK_ERROR_MESSAGE };
    }
  }, []);

  return {
    status: state.status,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchStatus,
    generate,
    verify,
  };
}
