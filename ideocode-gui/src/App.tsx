import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useAppStore } from "./stores/appStore";
import { useFileStore } from "./stores/fileStore";
import { isTheme } from "./lib/theme-registry";
import { isFirstLaunch, getVersion, getSettings } from "./lib/tauri-commands";

function App() {
  const setVersion = useAppStore((s) => s.setVersion);
  const theme = useAppStore((s) => s.theme);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const uiFontSize = useAppStore((s) => s.uiFontSize);
  const setUiFontSize = useAppStore((s) => s.setUiFontSize);
  const [onboarding, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("0.61.0"));
    getSettings()
      .then((s) => {
        const t = s.theme;
        if (isTheme(t)) {
          useAppStore.getState().setTheme(t);
        }
        useAppStore.getState().setAccentColor(s.accent_color ?? "#7C3AED");
        useAppStore.getState().setUiFontSize(s.ui_font_size ?? 13);
      })
      .catch(() => {});
    useFileStore.getState().loadTree();
    isFirstLaunch()
      .then((first) => setOnboarding(first))
      .catch(() => setOnboarding(false));
  }, [setVersion, setAccentColor, setUiFontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", theme);
    const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 250);
    return () => window.clearTimeout(timer);
  }, [theme]);

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
    return (
      <OnboardingWizard onComplete={() => setOnboarding(false)} />
    );
  }

  return <AppShell />;
}

export default App;
