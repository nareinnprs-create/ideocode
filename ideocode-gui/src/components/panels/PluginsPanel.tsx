import { useState } from "react";
import { AlertTriangle, Puzzle, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

interface Plugin { id: string; name: string; description: string; version: string; enabled: boolean; }

const STORAGE_KEY = "idc-plugins";
function loadPlugins(): Plugin[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function savePlugins(items: Plugin[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export function PluginsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [plugins, setPlugins] = useState<Plugin[]>(loadPlugins);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    const next = [...plugins, { id: `plug-${Date.now()}`, name, description: desc, version: "1.0.0", enabled: true }];
    setPlugins(next); savePlugins(next); setName(""); setDesc(""); setShowAdd(false);
  };

  const toggle = (id: string) => { const next = plugins.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p); setPlugins(next); savePlugins(next); };
  const remove = (id: string) => { const next = plugins.filter((p) => p.id !== id); setPlugins(next); savePlugins(next); };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Puzzle size={14} /> Plugins
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Plugin name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <button onClick={handleAdd} disabled={!name.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Install</button>
        </div>
      )}
      <div className="mx-3 mt-2 p-2 rounded bg-warning/5 border border-warning/20">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-warning shrink-0" />
          <span className="text-[11px] text-warning">This feature requires a backend server. Currently showing UI only.</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Puzzle size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No plugins installed</div>
          </div>
        ) : plugins.map((p) => (
          <div key={p.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(p.id)} className="shrink-0">
                {p.enabled ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-text-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">{p.name} <span className="text-text-muted">v{p.version}</span></div>
                <div className="text-[11px] text-text-muted truncate">{p.description}</div>
              </div>
              <button onClick={() => remove(p.id)} className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
