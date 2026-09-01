/**
 * FILE: components/shared/ToastStack.tsx
 * ROLE: Shared — renders the toast list from useToast().
 *
 * PURPOSE:
 * Fixed, top-center toast stack. Never blocks clicks underneath
 * (pointer-events: none on the wrapper, pointer-events: auto on each
 * toast only for hover state). Purely presentational — all state
 * lives in useToast.
 */
"use client";

import type { ToastMessage } from "./useToast";
import "../../app/styles/toast.css";

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="toastStack" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toastItem toastItem--${toast.type}`}
          onClick={() => onDismiss(toast.id)}
          role="status"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
