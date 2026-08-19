import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useAppStore } from "./stores/appStore";
import { useFileStore } from "./stores/fileStore";
import { isFirstLaunch, getVersion, getSettings } from "./lib/tauri-commands";
import { initTauriEventBridge } from "./lib/tauri-events";

function App() {
  const setVersion = useAppStore((s) => s.setVersion);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const uiFontSize = useAppStore((s) => s.uiFontSize);
  const setUiFontSize = useAppStore((s) => s.setUiFontSize);
  const [onboarding, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    initTauriEventBridge();
    getVersion().then(setVersion).catch(() => setVersion("0.64.1"));
    getSettings()
      .then((s) => {
        useAppStore.getState().setAccentColor(s.accent_color ?? "#6366F1");
        useAppStore.getState().setUiFontSize(s.ui_font_size ?? 13);
      })
      .catch(() => {});
    useFileStore.getState().loadSavedWorkspace();
    isFirstLaunch()
      .then((first) => setOnboarding(first))
      .catch(() => setOnboarding(false));
  }, [setVersion, setAccentColor, setUiFontSize]);

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
