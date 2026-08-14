export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tinted-theme";
export const THEME_COLOR_LIGHT = "#f7f8f9";
export const THEME_COLOR_DARK = "#0b0b0c";

let cachedMetaTag: HTMLMetaElement | null = null;

/**
 * Safely reads stored theme preference from localStorage, handling security exceptions
 * in restricted browser environments (e.g. Safari Private Mode).
 */
export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch (e) {
    // Return null in restricted environments
  }
  return null;
}

/**
 * Updates the <meta name="theme-color"> header content based on active theme
 * and system preference, caching the DOM reference for performance.
 */
export function updateMetaThemeColor(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  if (!cachedMetaTag || !document.contains(cachedMetaTag)) {
    cachedMetaTag = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  }
  if (!cachedMetaTag) return;

  const isLight =
    theme === "light" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: light)").matches);

  cachedMetaTag.setAttribute(
    "content",
    isLight ? THEME_COLOR_LIGHT : THEME_COLOR_DARK,
  );
}

/**
 * Applies the specified theme mode to document.documentElement and meta[name="theme-color"].
 * Explicitly handles "system", "light", and "dark".
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    // Ignore storage write errors in restricted environments
  }

  updateMetaThemeColor(theme);
}

/**
 * Pre-hydration inline script string injected into <head> via next/script beforeInteractive.
 * Aligned directly with applyTheme and updateMetaThemeColor to prevent theme drift.
 */
export const THEME_PRELOAD_SCRIPT = `(function() {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var root = document.documentElement;
    if (stored === "light" || stored === "dark") {
      root.setAttribute("data-theme", stored);
    } else {
      root.removeAttribute("data-theme");
    }
    var isLight = stored === "light" || ((!stored || stored === "system") && window.matchMedia("(prefers-color-scheme: light)").matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isLight ? "${THEME_COLOR_LIGHT}" : "${THEME_COLOR_DARK}");
    }
  } catch (e) {}
})();`;
