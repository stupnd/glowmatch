export type ThemeMode = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "tinted-theme";
export const THEME_COLOR_LIGHT = "#f7f8f9";
export const THEME_COLOR_DARK = "#0b0b0c";

let cachedMetaTag: HTMLMetaElement | null = null;

/**
 * Returns the HTML data-theme attribute value for a given theme mode or raw stored string,
 * or null if theme is "system", missing, or unrecognised.
 */
export function getThemeAttribute(theme: string | null): "light" | "dark" | null {
  return theme === "light" || theme === "dark" ? theme : null;
}

/**
 * Resolves whether a theme mode (or raw stored value) evaluates to light mode.
 */
export function isLightTheme(theme: string | null, prefersLight: boolean): boolean {
  return theme === "light" || ((!theme || theme === "system") && prefersLight);
}

/**
 * Resolves the effective theme mode ("light" or "dark") based on theme preference and system OS setting.
 */
export function resolveEffectiveTheme(
  theme: string | null,
  prefersLight: boolean,
): "light" | "dark" {
  return isLightTheme(theme, prefersLight) ? "light" : "dark";
}

/**
 * Resolves the theme color hex string for meta[name="theme-color"].
 */
export function resolveMetaThemeColor(theme: string | null, prefersLight: boolean): string {
  return isLightTheme(theme, prefersLight) ? THEME_COLOR_LIGHT : THEME_COLOR_DARK;
}

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

  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  cachedMetaTag.setAttribute("content", resolveMetaThemeColor(theme, prefersLight));
}

/**
 * Applies the specified theme mode to document.documentElement and meta[name="theme-color"].
 * Explicitly handles "system", "light", and "dark".
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const attr = getThemeAttribute(theme);

  if (attr) {
    root.setAttribute("data-theme", attr);
  } else {
    root.removeAttribute("data-theme");
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
 * Written as a self-contained inline script string to avoid brittleness under bundler minification.
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

    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    var isLight = stored === "light" || ((!stored || stored === "system") && prefersLight);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isLight ? "${THEME_COLOR_LIGHT}" : "${THEME_COLOR_DARK}");
    }
  } catch (e) {}
})();`;
