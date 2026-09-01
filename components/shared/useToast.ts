/**
 * FILE: components/shared/useToast.ts
 * PURPOSE:
 * Minimal toast state hook. Owns the list of currently visible toasts
 * and auto-dismisses each one after 2 seconds. Pair with
 * components/shared/ToastStack.tsx, which renders the stack at the
 * top-center of the screen.
 */
"use client";

import { useCallback, useState } from "react";

export type ToastType = "success" | "error" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { id, message, type }]);

      // Auto-dismiss after 2 seconds — matches the design standard for
      // every toast in the app.
      setTimeout(() => dismissToast(id), 2000);
    },
    [dismissToast]
  );

  return { toasts, showToast, dismissToast };
}
