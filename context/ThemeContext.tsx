/**
 * FILE: context/ThemeContext.tsx
 * ROLE: Site-wide — wraps the entire app via app/layout.tsx.
 *
 * PURPOSE:
 * Provides light/dark theme state to every component. Theme choice is
 * persisted in localStorage so it survives reloads and new tabs, and
 * is applied by setting data-theme="dark"|"light" on <html> —
 * globals.css reads that attribute to swap the color tokens (Rule 33.1).
 *
 * Uses useSyncExternalStore rather than a mount effect + setState:
 * localStorage is an external mutable store, and useSyncExternalStore
 * is React's purpose-built tool for reading one safely — it renders
 * "light" during SSR (getServerSnapshot, no localStorage available)
 * and the real stored value on the client, without the extra render
 * a setState-in-effect sync would otherwise cause.
 *
 * DATA FLOW:
 * 1. The anti-flash inline script in app/layout.tsx sets <html
 *    data-theme> before hydration, reading the same localStorage key,
 *    so first paint already matches the stored theme.
 * 2. toggleTheme() (called only from components/shared/ThemeToggle.tsx)
 *    writes the new value to localStorage and notifies subscribers.
 * 3. An effect keeps <html data-theme> in sync with whatever
 *    useSyncExternalStore currently reports — a plain DOM side effect,
 *    not a state sync, so it's exactly what effects are for.
 */
"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "matthewStudioTheme";

// Same-tab pub/sub for theme changes. The native "storage" event only
// fires in *other* tabs, never the tab that actually called
// localStorage.setItem — this fills that gap so toggling updates the
// current tab's UI immediately.
const themeChangeListeners = new Set<() => void>();

function notifyThemeChange() {
  themeChangeListeners.forEach((listener) => listener());
}

function subscribeToTheme(onStoreChange: () => void) {
  themeChangeListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    themeChangeListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

// Client snapshot — the live value from localStorage.
function getThemeSnapshot(): Theme {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

// Server snapshot — SSR has no localStorage, so this always returns
// "light". The anti-flash script in app/layout.tsx corrects <html
// data-theme> before hydration paints, so this never causes a flash.
function getThemeServerSnapshot(): Theme {
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);

  // Keeps <html data-theme> in sync with the store's current value —
  // a DOM side effect responding to React-visible state, not a
  // setState-in-effect sync.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = getThemeSnapshot() === "light" ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    notifyThemeChange();
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * useTheme
 * Reads the current theme and the toggle function. Throws if called
 * outside ThemeProvider — surfaces a missing provider during
 * development instead of silently returning undefined.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
