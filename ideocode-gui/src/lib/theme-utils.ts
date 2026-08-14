import type { Theme } from "./theme-registry";

export type ThemeMode = "auto" | "light" | "dark" | "custom";

export function systemPrefersLight(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches === true
  );
}

export function resolveTheme(
  mode: ThemeMode,
  theme: Theme,
  systemLight: boolean,
): Theme {
  if (mode === "light") return "ideo_light";
  if (mode === "dark") return "ideo_dark";
  if (mode === "auto") return systemLight ? "ideo_light" : "ideo_dark";
  return theme;
}

export function effectiveTheme(mode: ThemeMode, theme: Theme): Theme {
  return resolveTheme(mode, theme, systemPrefersLight());
}
