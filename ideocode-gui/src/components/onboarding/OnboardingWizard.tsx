import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useProviderStore } from '../../stores/providerStore';
import { useFileStore } from '../../stores/fileStore';
import { useAchievementStore } from '../../stores/achievementStore';
import type { Provider } from '../../lib/tauri-commands';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const STEPS = [
  {
    title: 'Welcome to IDEOCODE',
    description: 'The AI-native IDE. Let\'s get you set up in 30 seconds.',
    icon: '🚀',
  },
  {
    title: 'Choose a Theme',
    description: 'Pick your visual style.',
    icon: '🎨',
  },
  {
    title: 'Configure Provider',
    description: 'Connect an AI provider (or use the built-in Baanzon Verso engine).',
    icon: '🔌',
  },
  {
    title: 'Open a Workspace',
    description: 'Select a folder to start coding.',
    icon: '📁',
  },
];

const THEMES = [
  { id: 'midnight', name: 'Midnight', color: '#7C3AED' },
  { id: 'aurora', name: 'Aurora', color: '#06B6D4' },
  { id: 'forest', name: 'Forest', color: '#22C55E' },
  { id: 'ember', name: 'Ember', color: '#EF4444' },
  { id: 'light', name: 'Light', color: '#3B82F6' },
];

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { setTheme } = useAppStore();
  const { pickWorkspace } = useFileStore();
  const { providers } = useProviderStore();
  const achievementStore = useAchievementStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onComplete();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    },
    [onComplete]
  );

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const target = dialog.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? dialog).focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [handleKeyDown]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => onComplete();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="IDEOCODE Setup Wizard"
        className="w-full max-w-lg bg-bg-primary border border-border-default rounded-xl shadow-2xl p-8"
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">{STEPS[step].icon}</div>
          <h2 className="text-2xl font-bold text-text-primary">{STEPS[step].title}</h2>
          <p className="text-text-secondary mt-2">{STEPS[step].description}</p>
          <div className="mt-2">
            <span className="sr-only">Step {step + 1} of {STEPS.length}</span>
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-5 gap-3 mb-6">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id as any);
                  achievementStore.unlock('theme-change');
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-border-subtle hover:border-accent-primary transition-fast"
              >
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-xs text-text-secondary">{t.name}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2 mb-6">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
              ✅ Baanzon Verso (built-in) is available — no setup needed
            </div>
            {providers
              .filter((p: Provider) => p.id !== 'baanzon-verso')
              .map((p: Provider) => (
                <div key={p.id} className="p-3 rounded-lg border border-border-subtle text-sm text-text-secondary">
                  {p.name} — {p.is_configured ? '✅ Configured' : '⚠️ Needs API key'}
                </div>
              ))}
          </div>
        )}

        {step === 3 && (
          <div className="mb-6">
            <button
              onClick={async () => {
                await pickWorkspace();
                achievementStore.unlock('workspace-open');
              }}
              className="w-full p-4 rounded-lg border-2 border-dashed border-border-subtle hover:border-accent-primary text-text-secondary hover:text-text-primary transition-fast"
            >
              📂 Click to choose a folder
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={skip}
            className="text-sm text-text-secondary hover:text-text-primary transition-fast"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-fast ${
                  i === step ? 'bg-accent-primary' : 'bg-border-subtle'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover text-sm font-medium transition-fast"
          >
            {step === STEPS.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
