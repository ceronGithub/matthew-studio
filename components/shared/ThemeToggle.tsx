/**
 * FILE: components/shared/ThemeToggle.tsx
 * ROLE: Public — rendered inside NavBar.tsx (desktop nav row + mobile
 * slide-down panel).
 *
 * PURPOSE:
 * Single button that flips the site between light and dark theme via
 * ThemeContext. Shows the icon for the mode you'll switch TO (moon
 * while in light mode, sun while in dark mode) — the common toggle
 * convention, so the icon never just mirrors the current state back.
 */
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={className ? `themeToggle ${className}` : "themeToggle"}
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
    >
      {theme === "light" ? (
        <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
