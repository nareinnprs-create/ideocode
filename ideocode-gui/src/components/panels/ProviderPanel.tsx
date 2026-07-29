import { useEffect } from "react";
import { useProviderStore } from "../../stores/providerStore";
import { Cpu, Check } from "lucide-react";

export function ProviderPanel() {
  const { providers, status, loadProviders, loadStatus } =
    useProviderStore();

  useEffect(() => {
    loadProviders();
    loadStatus();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Current provider */}
      {status && (
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

      {/* Provider list */}
      <div className="flex-1 overflow-y-auto py-1">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isActive={status?.active_provider === provider.id}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  isActive,
}: {
  provider: { id: string; name: string; models: { id: string; name: string }[]; is_configured: boolean };
  isActive: boolean;
}) {
  return (
    <div className="px-3 py-2 hover:bg-bg-elevated transition-fast">
      <div className="flex items-center gap-2 mb-1">
        <div
          className={`w-2 h-2 rounded-full ${
            provider.is_configured ? "bg-success" : "bg-text-muted"
          }`}
        />
        <span className="text-xs font-medium text-text-primary flex-1">
          {provider.name}
        </span>
        {isActive && <Check size={12} className="text-accent-primary" />}
      </div>
      <div className="pl-4">
        {provider.models.map((model) => (
          <div
            key={model.id}
            className="text-[11px] text-text-secondary py-0.5 font-mono"
          >
            {model.name}
          </div>
        ))}
      </div>
    </div>
  );
}
