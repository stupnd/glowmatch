"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ThemeMode,
  getStoredTheme,
  applyTheme,
} from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  // Keep a ref to the latest active theme mode to allow a persistent matchMedia listener without re-attaching
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme() ?? "system";
    setTheme(stored);
    applyTheme(stored);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      if (themeRef.current === "system") {
        applyTheme("system");
      }
    };

    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      // Fallback for older browsers (e.g. Safari < 14)
      (mediaQuery as MediaQueryList).addListener(handleChange);
      return () => (mediaQuery as MediaQueryList).removeListener(handleChange);
    }
  }, []);

  const updateThemeMode = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const cycleTheme = () => {
    if (theme === "system") updateThemeMode("light");
    else if (theme === "light") updateThemeMode("dark");
    else updateThemeMode("system");
  };

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-pill border border-line bg-raised/50 px-2.5 py-1",
          className,
        )}
        aria-hidden="true"
      >
        <div className="h-4 w-4 rounded-full bg-text-muted/20" />
        <div className="hidden sm:inline-block h-3 w-8 rounded bg-text-muted/20" />
      </div>
    );
  }

  const label =
    theme === "system"
      ? "Theme: System (switch to Light)"
      : theme === "light"
      ? "Theme: Light (switch to Dark)"
      : "Theme: Dark (switch to System)";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-pill border border-line bg-raised/60 px-2.5 py-1",
        "text-small font-medium text-text-soft transition-colors duration-[var(--duration-fast)]",
        "hover:bg-raised hover:text-text focus-visible:outline-2",
        className,
      )}
    >
      {theme === "light" && (
        <>
          <svg
            className="h-4 w-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <span className="hidden sm:inline text-xs">Light</span>
        </>
      )}
      {theme === "dark" && (
        <>
          <svg
            className="h-4 w-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          <span className="hidden sm:inline text-xs">Dark</span>
        </>
      )}
      {theme === "system" && (
        <>
          <svg
            className="h-4 w-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path strokeLinecap="round" d="M8 20h8m-4-4v4" />
          </svg>
          <span className="hidden sm:inline text-xs">Auto</span>
        </>
      )}
    </button>
  );
}
