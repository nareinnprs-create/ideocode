import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useAppStore } from "./stores/appStore";
import { useFileStore } from "./stores/fileStore";
import { isTheme, type Theme } from "./lib/theme-registry";
import { isFirstLaunch, getVersion, getSettings } from "./lib/tauri-commands";

function hasLocalTheme(): boolean {
  try {
    return localStorage.getItem("ideocode.theme") !== null || localStorage.getItem("ideocode.themeMode") !== null;
  } catch {
    return false;
  }
}

function resolveTheme(
  mode: "auto" | "light" | "dark" | "custom",
  theme: Theme,
  systemLight: boolean,
): Theme {
  if (mode === "light") return "ideo_light";
  if (mode === "dark") return "ideo_dark";
  if (mode === "auto") return systemLight ? "ideo_light" : "ideo_dark";
  return theme;
}

function isNight(): boolean {
  const h = new Date().getHours();
  return h < 6 || h >= 19;
}

function App() {
  const setVersion = useAppStore((s) => s.setVersion);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const themeMode = useAppStore((s) => s.themeMode);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const uiFontSize = useAppStore((s) => s.uiFontSize);
  const setUiFontSize = useAppStore((s) => s.setUiFontSize);
  const [onboarding, setOnboarding] = useState<boolean | null>(null);
  const [systemLight, setSystemLight] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false,
  );

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("0.61.0"));
    getSettings()
      .then((s) => {
        if (!hasLocalTheme() && isTheme(s.theme)) {
          setTheme(s.theme);
        }
        useAppStore.getState().setAccentColor(s.accent_color ?? "#22C55E");
        useAppStore.getState().setUiFontSize(s.ui_font_size ?? 13);
      })
      .catch(() => {});
    useFileStore.getState().loadTree();
    isFirstLaunch()
      .then((first) => setOnboarding(first))
      .catch(() => setOnboarding(false));
  }, [setVersion, setAccentColor, setUiFontSize, setTheme]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ideocode.themeMode", themeMode);
      localStorage.setItem("ideocode.theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [themeMode, theme]);

  useEffect(() => {
    const root = document.documentElement;
    const effective = resolveTheme(themeMode, theme, systemLight);
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", effective);
    root.dataset.time = isNight() ? "night" : "day";
    const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 250);
    return () => window.clearTimeout(timer);
  }, [themeMode, theme, systemLight]);

  useEffect(() => {
    document.documentElement.style.setProperty("--idc-accent-primary", accentColor);
    document.documentElement.style.setProperty("--idc-accent-hover", accentColor);
    document.documentElement.style.setProperty("--idc-glow", `${accentColor}33`);
    document.documentElement.style.setProperty("--idc-glow-accent", `${accentColor}4d`);
  }, [accentColor]);

  useEffect(() => {
    const scale = (uiFontSize / 13) * 16;
    document.documentElement.style.fontSize = `${scale.toFixed(2)}px`;
  }, [uiFontSize]);

  if (onboarding === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="text-text-muted text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (onboarding) {
    return <OnboardingWizard onComplete={() => setOnboarding(false)} />;
  }

  return <AppShell />;
}

export default App;
