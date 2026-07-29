import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppShell } from "./components/layout/AppShell";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { useAppStore } from "./stores/appStore";
import { useFileStore } from "./stores/fileStore";
import { isFirstLaunch } from "./lib/tauri-commands";

function App() {
  const setVersion = useAppStore((s) => s.setVersion);
  const [onboarding, setOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    invoke<string>("get_version").then(setVersion).catch(console.error);
    useFileStore.getState().loadTree();
    isFirstLaunch()
      .then((first) => setOnboarding(first))
      .catch(() => setOnboarding(false));
  }, [setVersion]);

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
