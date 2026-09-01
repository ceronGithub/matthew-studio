/**
 * FILE: app/(auth)/login/page.tsx
 * ROLE: Public — served at "/auth/login". Handles both sign-in and
 * buyer registration (Mockup 2 design).
 *
 * PURPOSE:
 * Renders AuthBackgroundSlideshow behind a centered glass card. The
 * card holds two tabs — Sign In (default) and Create Account — that
 * cross-fade between SignInForm and RegisterForm. The background
 * keeps cycling independently of which tab is active.
 *
 * DATA FLOW:
 * Tab state is local (useState) — switching tabs never touches the
 * network. Each form owns its own submit flow and calls the shared
 * showToast() for feedback.
 */
"use client";

import { useState } from "react";
import { useToast } from "@/components/shared/useToast";
import ToastStack from "@/components/shared/ToastStack";
import AuthBackgroundSlideshow from "@/components/auth/AuthBackgroundSlideshow";
import SignInForm from "@/components/auth/SignInForm";
import RegisterForm from "@/components/auth/RegisterForm";

type AuthTab = "signIn" | "register";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>("signIn");
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <>
      <AuthBackgroundSlideshow />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="authGlassCard">
        <div className="authTabs">
          <button
            type="button"
            className={`authTab ${activeTab === "signIn" ? "authTab--active" : ""}`}
            onClick={() => setActiveTab("signIn")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`authTab ${activeTab === "register" ? "authTab--active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            Create account
          </button>
        </div>

        <div className="authTabContent" key={activeTab}>
          {activeTab === "signIn" ? (
            <SignInForm showToast={showToast} />
          ) : (
            <RegisterForm showToast={showToast} />
          )}
        </div>

        <p className="authSwitchPrompt">
          {activeTab === "signIn" ? (
            <>
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => setActiveTab("register")}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setActiveTab("signIn")}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </>
  );
}
