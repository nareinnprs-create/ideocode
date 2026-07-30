import { useEffect, useState } from "react";
import { useProviderStore } from "../../stores/providerStore";
import { useAppStore } from "../../stores/appStore";
import { Cpu, Check, ArrowLeft, RefreshCw, Eye, EyeOff } from "lucide-react";

export function ProviderPanel() {
  const { providers, status, loading, error, loadProviders, loadStatus, setActiveProvider } =
    useProviderStore();
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadProviders();
    loadStatus();
  }, []);

  const handleSetActive = (providerId: string, modelId: string) => {
    setActiveProvider(providerId, modelId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="px-1 pt-1">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-text-muted text-xs animate-pulse">
            <RefreshCw size={14} className="animate-spin" />
            Loading providers...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 my-2 p-2 rounded bg-bg-elevated border border-border-subtle">
          <div className="text-xs text-red-400 mb-1">{error}</div>
          <button
            onClick={() => { loadProviders(); loadStatus(); }}
            className="text-xs text-accent-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active provider */}
      {status && !loading && (
        <div className="px-3 py-3 border-b border-border-subtle">
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
            Active
          </div>
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-accent-primary" />
            <div>
              <div className="text-xs font-medium text-text-primary">
                {status.active_provider}
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                {status.active_model}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key input */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">API Key</div>
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter API key..."
              className="w-full pr-7 bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-text-muted outline-none focus:border-accent-primary"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary"
            >
              {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <button
            onClick={() => {
              if (apiKeyInput.trim()) {
                loadStatus();
                setApiKeyInput("");
              }
            }}
            disabled={!apiKeyInput.trim()}
            className="px-2 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast"
          >
            Save
          </button>
        </div>
        <div className="text-[10px] text-text-muted mt-1">
          Key is stored in the provider environment variable
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
        <span className="text-xs font-medium text-text-primary flex-1">
          {provider.name}
        </span>
        {isActive && <Check size={12} className="text-accent-primary shrink-0" />}
      </button>
      <div className="flex flex-wrap gap-1 pl-4">
        {provider.models.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className={`text-[11px] px-1.5 py-0.5 rounded font-mono transition-fast border ${
              activeModel === model.id
                ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                : "border-border-subtle text-text-secondary hover:border-text-muted"
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>
    </div>
  );
}
