export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tinted-theme";
export const THEME_COLOR_LIGHT = "#f7f8f9";
export const THEME_COLOR_DARK = "#0b0b0c";

/**
 * Applies the specified theme mode to document.documentElement and meta[name="theme-color"].
 * Explicitly handles "system", "light", and "dark".
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  if (theme === "system") {
    root.removeAttribute("data-theme");
    localStorage.setItem(THEME_STORAGE_KEY, "system");
  } else {
    root.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  updateMetaThemeColor(theme);
}

/**
 * Updates the <meta name="theme-color"> header content based on active theme
 * and system preference.
 */
export function updateMetaThemeColor(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) return;

  const isLight =
    theme === "light" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: light)").matches);

  metaThemeColor.setAttribute(
    "content",
    isLight ? THEME_COLOR_LIGHT : THEME_COLOR_DARK,
  );
}

/**
 * Pre-hydration inline script string injected into <head> via next/script beforeInteractive.
 * Handles "system", "light", and "dark" explicitly to avoid theme drift and FOUC.
 */
export const THEME_PRELOAD_SCRIPT = `(function() {
  try {
    var key = "${THEME_STORAGE_KEY}";
    var lightColor = "${THEME_COLOR_LIGHT}";
    var darkColor = "${THEME_COLOR_DARK}";
    var stored = localStorage.getItem(key);
    var root = document.documentElement;

    if (stored === "light" || stored === "dark") {
      root.setAttribute("data-theme", stored);
    } else {
      root.removeAttribute("data-theme");
    }

    var isLight = stored === "light" || ((!stored || stored === "system") && window.matchMedia("(prefers-color-scheme: light)").matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isLight ? lightColor : darkColor);
    }
  } catch (e) {}
})();`;
