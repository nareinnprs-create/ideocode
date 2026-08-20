import { useState } from "react";
import { AlertTriangle, Plug, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

interface McpServer {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error";
  tools: string[];
}

const STORAGE_KEY = "idc-mcp";
function loadServers(): McpServer[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveServers(items: McpServer[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export function McpPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [servers, setServers] = useState<McpServer[]>(loadServers);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !url.trim()) return;
    const next = [...servers, { id: `mcp-${Date.now()}`, name, url, enabled: true, status: "disconnected" as const, tools: [] }];
    setServers(next);
    saveServers(next);
    setName(""); setUrl(""); setShowAdd(false);
  };

  const toggle = (id: string) => {
    const next = servers.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s);
    setServers(next);
    saveServers(next);
  };

  const remove = (id: string) => {
    const next = servers.filter((s) => s.id !== id);
    setServers(next);
    saveServers(next);
  };

  const STATUS_COLORS = { connected: "text-success", disconnected: "text-text-muted", error: "text-error" };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="MCP servers">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Plug size={14} /> MCP Services
        </button>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated">
          <Plus size={14} /> Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Server name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Server URL or path" value={url} onChange={(e) => setUrl(e.target.value)}
            className="w-full p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <button onClick={handleAdd} disabled={!name.trim() || !url.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">
            Add Server
          </button>
        </div>
      )}
      <div className="mx-3 mt-2 p-2 rounded bg-warning/5 border border-warning/20">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-warning shrink-0" />
          <span className="text-[11px] text-warning">This feature requires a backend server. Currently showing UI only.</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Plug size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No MCP servers configured</div>
          </div>
        ) : (
          servers.map((s) => (
            <div key={s.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group">
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(s.id)} className="shrink-0" aria-label={s.enabled ? `Disable ${s.name}` : `Enable ${s.name}`}>
                  {s.enabled ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-text-muted" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{s.name}</span>
                    <span className={`text-[10px] font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                  </div>
                  <div className="text-[11px] text-text-muted font-mono truncate">{s.url}</div>
                </div>
                <button onClick={() => remove(s.id)} className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast" aria-label={`Remove ${s.name}`}>
                  <Trash2 size={11} />
                </button>
              </div>
              {s.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5 ml-8">
                  {s.tools.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
