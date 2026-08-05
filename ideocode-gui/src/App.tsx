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
  const [onboarding, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("0.61.0"));
    getSettings()
      .then((s) => {
        const t = s.theme;
        if (isTheme(t)) {
          useAppStore.getState().setTheme(t);
        }
      })
      .catch(() => {});
    useFileStore.getState().loadTree();
    isFirstLaunch()
      .then((first) => setOnboarding(first))
      .catch(() => setOnboarding(false));
  }, [setVersion]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
