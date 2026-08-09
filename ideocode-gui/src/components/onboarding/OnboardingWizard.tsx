import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Server,
  Wifi,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { updateSettings, getGatewayStatus } from "../../lib/tauri-commands";
import type { AppSettings } from "../../lib/tauri-commands";
import { THEMES, type Theme } from "../../lib/theme-registry";
import { useAppStore } from "../../stores/appStore";

type Step = "welcome" | "theme" | "provider" | "provision" | "done";

const PROVIDERS = [
  { id: "baanzon-verso", label: "Baanzon Verso", models: "Built-in AI (auto routing)" },
  { id: "openai", label: "OpenAI", models: "GPT-4o, GPT-4o-mini" },
  { id: "anthropic", label: "Anthropic", models: "Claude 3.5 Sonnet, Haiku" },
  { id: "google", label: "Google Gemini", models: "Gemini 2.5 Pro, Flash" },
  { id: "openrouter", label: "OpenRouter", models: "100+ models" },
];

const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  "baanzon-verso": "auto",
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet",
  google: "gemini-2.5-pro",
  openrouter: "anthropic/claude-sonnet-4-6",
};

const PROVISION_TIMEOUT_MS = 45_000;

interface Props {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [theme, setTheme] = useState<Theme>("midnight");
  const [provider, setProvider] = useState("baanzon-verso");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [engine, setEngine] = useState<{
    online: boolean;
    installing: boolean;
    port: number;
    engine: string;
  } | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionTimedOut, setProvisionTimedOut] = useState(false);

  const provisionRef = useRef(false);

  const next = () => {
    if (step === "welcome") setStep("theme");
    else if (step === "theme") setStep("provider");
    else if (step === "provider") {
      setSaving(true);
      setSaveError(null);
      const settings: AppSettings = {
        theme,
        active_provider: provider,
        active_model: DEFAULT_MODEL_BY_PROVIDER[provider] ?? "auto",
        font_size: 13,
        font_family: "JetBrains Mono",
        tab_size: 2,
        word_wrap: false,
        minimap: false,
        auto_save: true,
        language: "en",
        mode: "normal",
      };
      updateSettings(settings)
        .then(() => {
          setSaving(false);
          if (provider === "baanzon-verso") {
            setStep("provision");
          } else {
            setStep("done");
          }
        })
        .catch((e) => {
          setSaving(false);
          setSaveError(`Failed to save settings: ${e}`);
        });
    }
  };

  useEffect(() => {
    if (step !== "provision") {
      provisionRef.current = false;
      return;
    }
    provisionRef.current = true;
    setProvisionError(null);
    setProvisionTimedOut(false);
    setEngine(null);

    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      if (!provisionRef.current || cancelled) return;
      try {
        const status = await getGatewayStatus();
        if (cancelled) return;
        setEngine({
          online: status.online,
          installing: status.installing,
          port: status.port,
          engine: status.engine,
        });
        if (status.online) {
          setTimeout(() => {
            if (!cancelled && provisionRef.current) setStep("done");
          }, 600);
          return;
        }
      } catch (e) {
        if (!cancelled) setProvisionError(`Engine status unavailable: ${e}`);
      }
      if (Date.now() - startedAt > PROVISION_TIMEOUT_MS) {
        if (!cancelled) setProvisionTimedOut(true);
        return;
      }
      setTimeout(poll, 800);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const chooseTheme = (id: Theme) => {
    setTheme(id);
    useAppStore.getState().setTheme(id);
  };

  const prev = () => {
    if (step === "theme") setStep("welcome");
    else if (step === "provider") setStep("theme");
    else if (step === "provision") {
      provisionRef.current = false;
      setStep("provider");
    }
  };

  const progress =
    step === "welcome" ? 25 :
    step === "theme" ? 50 :
    step === "provider" ? 75 :
    step === "provision" ? 90 :
    100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-lg mx-4">
        {/* Progress bar */}
        <div className="h-1 bg-bg-tertiary rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {step === "welcome" && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="text-5xl font-display font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              IDEOCODE
            </div>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              Welcome to the multi-model AI coding assistant.
              Let's get you set up in under a minute.
            </p>
            <div className="flex items-center justify-center gap-3 text-text-muted text-xs">
              <Sparkles size={16} className="text-accent-primary" />
              <span>Offline-first · Multi-provider · Keyboard-first</span>
            </div>
            <button
              onClick={next}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-fast"
            >
              Get Started <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === "theme" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-lg font-display font-semibold text-text-primary">Choose Your Theme</h2>
              <p className="text-text-muted text-xs mt-1">Pick a look that suits your style</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => chooseTheme(t.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-left
                    ${theme === t.id
                      ? "border-accent-primary shadow-glow-primary"
                      : "border-border-subtle hover:border-text-muted"
                    }`}
                >
                  <div
                    className="h-16 rounded-lg mb-2 border border-border-subtle"
                    style={{
                      background: `linear-gradient(135deg, ${t.bg} 0%, ${t.bgSecondary} 60%, ${t.accent} 130%)`,
                    }}
                  />
                  <div className="text-xs font-medium text-text-primary">{t.label}</div>
                  <div className="text-[10px] text-text-muted">{t.description}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={prev} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-fast">
                <ChevronLeft size={14} /> Back
              </button>
              <button onClick={next} className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-medium hover:bg-accent-hover transition-fast">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === "provider" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-lg font-display font-semibold text-text-primary">Select AI Provider</h2>
              <p className="text-text-muted text-xs mt-1">Choose your primary AI provider</p>
            </div>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
                    ${provider === p.id
                      ? "border-accent-primary bg-accent-primary/5"
                      : "border-border-subtle hover:border-text-muted"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                    ${provider === p.id ? "bg-accent-primary text-white" : "bg-bg-elevated text-text-muted"}`}>
                    {p.label[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-text-primary">{p.label}</div>
                    <div className="text-[10px] text-text-muted">{p.models}</div>
                  </div>
                  {provider === p.id && <Check size={16} className="text-accent-primary" />}
                </button>
              ))}
            </div>
            {saveError && (
              <div className="p-2 rounded bg-error/10 border border-error/30">
                <div className="text-xs text-error">{saveError}</div>
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={prev} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-fast">
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={next}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-medium hover:bg-accent-hover transition-fast disabled:opacity-50"
              >
                {saving ? "Saving..." : "Continue"}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === "provision" && (
          <div className="space-y-6 animate-blur-in">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center mb-4">
                {engine?.online ? (
                  <Check size={28} className="text-success" />
                ) : (
                  <Server size={28} className="text-accent-primary" />
                )}
              </div>
              <h2 className="text-lg font-display font-semibold text-text-primary">
                Provisioning Baanzon Verso
              </h2>
              <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
                {engine?.online
                  ? "Your AI engine is ready. Setting things up..."
                  : engine?.installing
                    ? "Installing the Baanzon Verso engine on your machine..."
                    : "Starting the Baanzon Verso engine (invisible, automatic)..."
                  }
              </p>
            </div>

            <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  engine?.online ? "bg-success" : "shimmer"
                }`}
                style={{
                  width: engine?.online
                    ? "100%"
                    : engine?.installing
                      ? "55%"
                      : "75%",
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${engine?.online ? "bg-success" : "bg-accent-primary animate-pulse"}`} />
                <span className="text-text-secondary">
                  {engine?.engine || "baanzon-verso"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Wifi size={12} className={engine?.online ? "text-success" : ""} />
                <span>
                  {engine?.online
                    ? `Engine online at http://localhost:${engine.port}`
                    : "Local engine endpoint"}
                </span>
              </div>
            </div>

            {(provisionError || provisionTimedOut) && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  {provisionTimedOut
                    ? "The engine is taking longer than expected to come online. You can continue anyway and it will keep starting in the background."
                    : provisionError}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={prev}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-fast"
              >
                <ChevronLeft size={14} /> Back
              </button>
              {(provisionError || provisionTimedOut) && (
                <button
                  onClick={() => setStep("done")}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-medium hover:bg-accent-hover transition-fast"
                >
                  Continue anyway <RefreshCw size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <Check size={32} className="text-success" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-text-primary">You're All Set!</h2>
              <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
                {THEMES.find(t => t.id === theme)?.label} theme · {PROVIDERS.find(p => p.id === provider)?.label} provider
              </p>
            </div>
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-fast"
            >
              Start Using IDEOCODE <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
