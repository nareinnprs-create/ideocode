import { useEffect, useState, useRef } from "react";
import { useProviderStore } from "../../stores/providerStore";
import { useAppStore } from "../../stores/appStore";
import { getGatewayStatus, getSettings, updateSettings, type GatewayStatus } from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";
import { Cpu, Check, ArrowLeft, RefreshCw, Eye, EyeOff, Zap, Terminal } from "lucide-react";
import { listen } from "@tauri-apps/api/event";

const ENV_KEY_MAP: Record<string, string> = {
  "baanzon-verso": "OMNIROUTE_API_KEY",
  omniroute: "OMNIROUTE_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export function ProviderPanel() {
  const { providers, status, loading, error, loadProviders, loadStatus, setActiveProvider } =
    useProviderStore();
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView();
  }, [logs, logsOpen]);
  const loadingTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    loadProviders();
    loadStatus();

    loadingTimer.current = setTimeout(() => {
      setTimedOut(true);
    }, 5000);

    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!loading) setTimedOut(false);
  }, [loading]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const status = await getGatewayStatus();
        if (active) setGateway(status);
      } catch {
        // transient IPC failure; keep last known state
      }
    };
    void poll();
    const id = setInterval(poll, 10000);
    const unlistenLog = listen<string>("baanzon://log_line", (e) => {
      setLogs((prev) => [...prev, e.payload].slice(-50));
    });
    
    return () => {
      active = false;
      clearInterval(id);
      unlistenLog.then(f => f());
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRightPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setRightPanelOpen]);

  const handleSetActive = (providerId: string, modelId: string) => {
    setActiveProvider(providerId, modelId);
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Provider settings">
      {/* Back button */}
      <div className="px-1 pt-1">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* Loading */}
      {loading && !timedOut && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-fg-muted text-xs animate-pulse">
            <RefreshCw size={14} className="animate-spin" />
            Loading providers...
          </div>
        </div>
      )}

      {loading && timedOut && (
        <div className="mx-3 my-2 p-2 rounded bg-surface-elevated border border-border-subtle">
          <div className="text-xs text-warning mb-1">Loading is taking longer than expected.</div>
          <button
            onClick={() => { setTimedOut(false); loadProviders(); loadStatus(); }}
            className="text-xs text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 my-2 p-2 rounded bg-surface-elevated border border-border-subtle">
          <div className="text-xs text-error mb-1">{error}</div>
          <button
            onClick={() => { loadProviders(); loadStatus(); }}
            className="text-xs text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active provider */}
      {status && !loading && (
        <div className="px-3 py-3 border-b border-border-subtle surface-blur">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1.5">
            Active
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-accent" />
            <div>
              <div className="text-xs font-medium text-fg-primary">
                {status.active_provider}
              </div>
              <div className="text-[11px] text-fg-muted font-mono">
                {status.active_model}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Built-in engine status */}
      {gateway && (
        <div className="border-b border-border-subtle surface-blur">
          <div
            className="px-3 py-2 flex items-center gap-2"
            title={gateway.disabled ? "Baanzon Verso is disabled via IDEOCODE_DISABLE_BAANZON_GATEWAY" : gateway.base_url}
          >
            <Zap
              size={14}
              className={
                gateway.online ? "text-success" : gateway.installing ? "text-warning" : "text-error"
              }
            />
            <span className="text-xs font-medium text-fg-primary flex-1">{gateway.engine}</span>
            <span className="text-[11px] text-fg-muted font-mono">
              {gateway.online
                ? "ONLINE"
                : gateway.installing
                  ? "starting"
                  : gateway.disabled
                    ? "disabled"
                    : "offline"}
            </span>
            <button
              onClick={() => setLogsOpen(!logsOpen)}
              className="p-1 rounded hover:bg-surface-elevated text-fg-muted hover:text-fg-primary transition-fast"
              aria-label="Toggle engine logs"
              aria-expanded={logsOpen}
            >
              <Terminal size={14} />
            </button>
          </div>
          {logsOpen && (
            <div className="bg-surface px-3 py-2 border-t border-border-subtle max-h-32 overflow-y-auto text-left font-mono text-[10px] text-fg-muted leading-relaxed">
              {logs.length === 0 ? (
                <div className="italic opacity-50">No logs yet...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap">{log}</div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* API Key input */}
      <div className="px-3 py-2 border-b border-border-subtle surface-blur">
        <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1.5">API Key</div>
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter API key..."
              aria-label="API key"
              className="w-full pr-7 bg-surface text-fg-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-fg-muted outline-none focus:border-accent"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-fg-muted hover:text-fg-primary transition-fast"
            >
              {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <button
            onClick={async () => {
              if (!apiKeyInput.trim()) return;
              try {
                const settings = await getSettings();
                const activeProvider = status?.active_provider ?? settings.active_provider ?? "openai";
                // Key map uses the env-var names that resolve_api_key reads.
                const envKey = ENV_KEY_MAP[activeProvider] ?? "OPENAI_API_KEY";
                settings.api_keys = { ...(settings.api_keys || {}), [envKey]: apiKeyInput.trim() };
                await updateSettings(settings);
                notify("success", "API key saved", envKey);
                setApiKeyInput("");
                void loadStatus();
                void loadProviders();
              } catch (e) {
                notify("error", "Failed to save key", `${e}`);
              }
            }}
            disabled={!apiKeyInput.trim()}
            className="px-2 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast"
          >
            Save
          </button>
        </div>
        <div className="text-[11px] text-fg-muted mt-1">
          API keys are stored locally in your settings and used by the active provider.
        </div>
      </div>

      {/* Provider list */}
      <div className="flex-1 overflow-y-auto py-1">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isActive={status?.active_provider === provider.id}
            activeModel={status?.active_model}
            onSelectProvider={() => {
              const firstModel = provider.models[0];
              if (firstModel) {
                handleSetActive(provider.id, firstModel.id);
              }
            }}
            onSelectModel={(modelId) => handleSetActive(provider.id, modelId)}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  isActive,
  activeModel,
  onSelectProvider,
  onSelectModel,
}: {
  provider: { id: string; name: string; models: { id: string; name: string }[]; is_configured: boolean };
  isActive: boolean;
  activeModel?: string;
  onSelectProvider: () => void;
  onSelectModel: (modelId: string) => void;
}) {
  return (
    <div className="px-3 py-2 border-b border-border-subtle last:border-none">
      <button
        onClick={onSelectProvider}
        className="w-full flex items-center gap-2 mb-1.5 text-left"
      >
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            provider.is_configured ? "bg-success" : "bg-text-muted"
          }`}
        />
        <span className="text-xs font-medium text-fg-primary flex-1">
          {provider.name}
        </span>
        {isActive && <Check size={12} className="text-accent shrink-0" />}
      </button>
      <div className="flex flex-wrap gap-1 pl-4">
        {provider.models.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className={`text-[11px] px-1.5 py-0.5 rounded font-mono transition-fast border ${
              activeModel === model.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border-subtle text-fg-secondary hover:border-text-muted"
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>
    </div>
  );
}
