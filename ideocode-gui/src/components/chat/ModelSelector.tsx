import { useEffect, useRef, useState, useMemo } from "react";
import { Search, ChevronDown, Cpu, Globe, Sparkles } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useProviderStore } from "../../stores/providerStore";
import { getSettings, updateSettings, type Provider } from "../../lib/tauri-commands";

export function ModelSelector() {
  const model = useChatStore((s) => s.model);
  const setModel = useChatStore((s) => s.setModel);
  const providers = useProviderStore((s) => s.providers);
  const loadProviders = useProviderStore((s) => s.loadProviders);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  const selectedModel = useMemo(() => {
    for (const p of providers) {
      const m = p.models.find((m) => m.id === model);
      if (m) return { model: m, provider: p };
    }
    return null;
  }, [providers, model]);

  const filtered = useMemo(() => {
    if (!providers.length) return [];
    const q = search.toLowerCase();
    return providers
      .filter((p) => {
        if (activeProvider && p.id !== activeProvider) return false;
        if (q) {
          return (
            p.name.toLowerCase().includes(q) ||
            p.models.some((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .map((p) => ({
        ...p,
        models: p.models.filter((m) => {
          if (q) {
            return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
          }
          return true;
        }),
      }))
      .filter((p) => p.models.length > 0);
  }, [providers, search, activeProvider]);

  const selectModel = async (providerId: string, modelId: string) => {
    setModel(modelId);
    try {
      const s = await getSettings();
      await updateSettings({ ...s, active_provider: providerId, active_model: modelId });
    } catch {}
    setOpen(false);
    setSearch("");
  };

  const providerIcon = (p: Provider) => {
    if (p.id.includes("baanzon") || p.id.includes("omniroute")) return <Sparkles size={12} className="text-accent" />;
    if (p.id.includes("openai")) return <Cpu size={12} className="text-success" />;
    if (p.id.includes("anthropic")) return <Cpu size={12} className="text-warning" />;
    return <Globe size={12} className="text-info" />;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-fg-secondary hover:text-fg-primary hover:bg-surface-hover border border-transparent hover:border-border-subtle transition-fast max-w-[160px]"
        aria-label="Select model"
        aria-expanded={open}
      >
        <span className="truncate">{selectedModel ? selectedModel.model.name : model || "auto"}</span>
        <ChevronDown size={10} className={`text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-[300px] rounded-xl border border-border-default bg-surface shadow-xl animate-scale-in overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
            <Search size={13} className="text-fg-muted shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="flex-1 bg-transparent text-sm text-fg-primary placeholder:text-fg-muted outline-none"
            />
          </div>

          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border-subtle overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveProvider(null)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-fast shrink-0 ${
                activeProvider === null
                  ? "bg-accent/12 text-accent"
                  : "text-fg-muted hover:text-fg-secondary hover:bg-surface-hover"
              }`}
            >
              All
            </button>
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProvider(activeProvider === p.id ? null : p.id)}
                className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full transition-fast shrink-0 ${
                  activeProvider === p.id
                    ? "bg-accent/12 text-accent"
                    : "text-fg-muted hover:text-fg-secondary hover:bg-surface-hover"
                }`}
              >
                {providerIcon(p)}
                {p.name}
              </button>
            ))}
          </div>

          <div className="max-h-[280px] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-fg-muted">No models found</div>
            )}
            {filtered.map((p) => (
              <div key={p.id}>
                <div className="flex items-center gap-2 px-3 py-1.5">
                  {providerIcon(p)}
                  <span className="text-[11px] font-semibold text-fg-secondary uppercase tracking-wide">{p.name}</span>
                  {!p.is_configured && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning-muted text-warning font-medium">Unconfigured</span>
                  )}
                </div>
                {p.models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => selectModel(p.id, m.id)}
                    className={`w-full flex items-center gap-2 px-5 py-1.5 text-left transition-fast ${
                      model === m.id
                        ? "bg-accent/10 text-accent"
                        : "text-fg-secondary hover:bg-surface-hover"
                    }`}
                  >
                    <span className="text-[12px] font-medium truncate flex-1">{m.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {m.supports_tools && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-surface-elevated text-fg-muted" title="Supports tools">T</span>
                      )}
                      {m.supports_vision && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-surface-elevated text-fg-muted" title="Supports vision">V</span>
                      )}
                      {model === m.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
