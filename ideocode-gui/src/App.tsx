import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useAppStore } from "./stores/appStore";
import { useFileStore } from "./stores/fileStore";
import { useAchievementStore } from "./stores/achievementStore";
import { useThemeStore } from "./stores/themeStore";
import { isFirstLaunch, getVersion, getSettings } from "./lib/tauri-commands";
import { initTauriEventBridge } from "./lib/tauri-events";

function AchievementToast() {
  const showNotification = useAchievementStore((s) => s.showNotification);
  if (!showNotification) return null;
  return (
    <div 
      role="alert"
      aria-live="assertive"
      className="fixed top-4 right-4 z-50 bg-[var(--accent)] text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in flex items-center gap-2"
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
    useThemeStore.getState().init();
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
      <div className="flex flex-col items-center justify-center h-screen bg-[#0D0B14] gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center animate-pulse">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div className="text-[#E8E4F0] text-base font-semibold tracking-wide">IDEOCODE</div>
        <div className="w-24 h-0.5 bg-[#1E1A2E] rounded overflow-hidden">
          <div className="w-2/5 h-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] rounded animate-[slide_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    );
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
