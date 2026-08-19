import { useState } from "react";
import { AlertTriangle, Monitor, Plus, Trash2, Globe } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

interface RemoteHost { id: string; name: string; host: string; port: number; user: string; connected: boolean; }

const STORAGE_KEY = "idc-remote";
function loadHosts(): RemoteHost[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveHosts(items: RemoteHost[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export function RemoteDevPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [hosts, setHosts] = useState<RemoteHost[]>(loadHosts);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [user, setUser] = useState("root");

  const handleAdd = () => {
    if (!name.trim() || !host.trim()) return;
    const next = [...hosts, { id: `host-${Date.now()}`, name, host, port: parseInt(port) || 22, user, connected: false }];
    setHosts(next); saveHosts(next); setName(""); setHost(""); setShowAdd(false);
  };

  const toggleConnect = (id: string) => {
    const next = hosts.map((h) => h.id === id ? { ...h, connected: !h.connected } : h);
    setHosts(next); saveHosts(next);
  };

  const remove = (id: string) => {
    const next = hosts.filter((h) => h.id !== id);
    setHosts(next); saveHosts(next);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Monitor size={14} /> Remote Dev
        </button>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated">
          <Plus size={14} /> Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Connection name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Host address" value={host} onChange={(e) => setHost(e.target.value)}
            className="w-full p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <div className="flex gap-1.5">
            <input type="text" placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)}
              className="w-20 p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
            <input type="text" placeholder="User" value={user} onChange={(e) => setUser(e.target.value)}
              className="flex-1 p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          </div>
          <button onClick={handleAdd} disabled={!name.trim() || !host.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Add Host</button>
        </div>
      )}
      <div className="mx-3 mt-2 p-2 rounded bg-warning/5 border border-warning/20">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-warning shrink-0" />
          <span className="text-[11px] text-warning">This feature requires a backend server. Currently showing UI only.</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {hosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Monitor size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No remote connections</div>
          </div>
        ) : hosts.map((h) => (
          <div key={h.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <Globe size={14} className={h.connected ? "text-success" : "text-text-muted"} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">{h.name}</div>
                <div className="text-[11px] text-text-muted font-mono truncate">{h.user}@{h.host}:{h.port}</div>
              </div>
              <button onClick={() => toggleConnect(h.id)}
                className={`text-[10px] px-2 py-1 rounded transition-fast ${h.connected ? "bg-success/10 text-success" : "bg-bg-tertiary text-text-muted hover:text-text-primary"}`}>
                {h.connected ? "Connected" : "Connect"}
              </button>
              <button onClick={() => remove(h.id)} className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
