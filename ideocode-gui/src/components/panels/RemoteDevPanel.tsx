import { useState } from "react";
import { Monitor, Plus, Trash2, Globe } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useRemoteStore, type RemoteHostType } from "../../stores/remoteStore";

export function RemoteDevPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const hosts = useRemoteStore((s) => s.hosts);
  const addHost = useRemoteStore((s) => s.add);
  const removeHost = useRemoteStore((s) => s.remove);
  const connect = useRemoteStore((s) => s.connect);
  const disconnect = useRemoteStore((s) => s.disconnect);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [user, setUser] = useState("root");
  const [hostType, setHostType] = useState<RemoteHostType>("ssh");

  const handleAdd = () => {
    if (!name.trim() || !host.trim()) return;
    addHost({
      name,
      host,
      port: parseInt(port) || 22,
      user,
      type: hostType,
      config: {},
    });
    setName("");
    setHost("");
    setShowAdd(false);
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      connected: "bg-success/10 text-success",
      connecting: "bg-warning/10 text-warning",
      error: "bg-error/10 text-error",
      disconnected: "bg-bg-tertiary text-text-muted",
    };
    return colors[status] ?? "bg-bg-tertiary text-text-muted";
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
          <select value={hostType} onChange={(e) => setHostType(e.target.value as RemoteHostType)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary">
            <option value="ssh">SSH</option>
            <option value="wsl">WSL</option>
            <option value="docker">Docker</option>
          </select>
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
      <div className="flex-1 overflow-y-auto">
        {hosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Monitor size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No remote connections</div>
          </div>
        ) : hosts.map((h) => (
          <div key={h.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <Globe size={14} className={h.status === "connected" ? "text-success" : "text-text-muted"} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">{h.name}</div>
                <div className="text-[11px] text-text-muted font-mono truncate">{h.user}@{h.host}:{h.port}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{h.type}</div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor(h.status)}`}>{h.status}</span>
              {h.status === "connected" ? (
                <button onClick={() => disconnect(h.id)}
                  className="text-[10px] px-2 py-1 rounded bg-success/10 text-success hover:bg-success/20 transition-fast">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => connect(h.id)} disabled={h.status === "connecting"}
                  className="text-[10px] px-2 py-1 rounded bg-bg-tertiary text-text-muted hover:text-text-primary disabled:opacity-50 transition-fast">
                  {h.status === "connecting" ? "Connecting..." : "Connect"}
                </button>
              )}
              <button onClick={() => removeHost(h.id)} className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
