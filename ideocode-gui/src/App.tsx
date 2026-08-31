import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useAppStore } from "./stores/appStore";
import { useFileStore } from "./stores/fileStore";
import { useAchievementStore } from "./stores/achievementStore";
import { useThemeStore } from "./stores/themeStore";
import { isFirstLaunch, getVersion, getSettings } from "./lib/tauri-commands";
import { initTauriEventBridge } from "./lib/tauri-events";
import { startAutomationScheduler } from "./stores/automationStore";

function AchievementToast() {
  const showNotification = useAchievementStore((s) => s.showNotification);
  if (!showNotification) return null;
  return (
    <div 
      role="alert"
      aria-live="assertive"
      className="fixed top-4 right-4 z-50 bg-accent text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-2"
    >
      <span className="text-xl">🏆</span>
      <div>
        <div className="font-bold text-sm">Achievement Unlocked!</div>
        <div className="text-xs opacity-90">{showNotification}</div>
      </div>
    </div>
  );
}

function App() {
  const setVersion = useAppStore((s) => s.setVersion);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const uiFontSize = useAppStore((s) => s.uiFontSize);
  const setUiFontSize = useAppStore((s) => s.setUiFontSize);
  const [onboarding, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    initTauriEventBridge();
    startAutomationScheduler();
    useThemeStore.getState().init();
    getVersion().then(setVersion).catch(() => setVersion("1.2.2"));
    getSettings()
      .then((s) => {
        useAppStore.getState().setAccentColor(s.accent_color ?? "#6366F1");
        useAppStore.getState().setUiFontSize(s.ui_font_size ?? 13);
        if (s.theme) {
          useAppStore.getState().setTheme(s.theme as never);
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      });
    useFileStore.getState().loadSavedWorkspace();
    isFirstLaunch()
      .then((first) => setOnboarding(first))
      .catch(() => setOnboarding(false));
  }, [setVersion, setAccentColor, setUiFontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty("--idc-accent", accentColor);
    document.documentElement.style.setProperty("--idc-accent-hover", accentColor);
    document.documentElement.style.setProperty("--idc-glow", `${accentColor}33`);
    document.documentElement.style.setProperty("--idc-glow-accent", `${accentColor}4d`);
  }, [accentColor]);

  useEffect(() => {
    const scale = (uiFontSize / 13) * 16;
    document.documentElement.style.fontSize = `${scale.toFixed(2)}px`;
  }, [uiFontSize]);

  if (onboarding === null) {
    return null;
  }

  if (onboarding) {
    return <OnboardingWizard onComplete={() => setOnboarding(false)} />;
  }

  return (
    <>
      <AppShell />
      <AchievementToast />
    </>
  );
}

export default App;
