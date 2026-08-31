import { useState } from "react";
import { Puzzle, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { usePluginStore } from "../../stores/pluginStore";

export function PluginsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const plugins = usePluginStore((s) => s.installed);
  const install = usePluginStore((s) => s.install);
  const toggle = usePluginStore((s) => s.toggle);
  const uninstall = usePluginStore((s) => s.uninstall);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    install({
      id: `plug-${Date.now()}`,
      name,
      description: desc,
      version: "1.0.0",
      author: "local",
      enabled: true,
      source: "local",
      skills: [],
      commands: [],
      hooks: [],
      mcpServers: [],
    });
    setName("");
    setDesc("");
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Plugins">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated">
          <Puzzle size={14} /> Plugins
        </button>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover transition-fast rounded hover:bg-surface-elevated">
          + Add
        </button>
      </div>
      <div className="mx-3 my-1.5 p-2 rounded bg-warning/10 border border-warning/30">
        <div className="text-[11px] text-warning">
          Plugin runtime is not yet wired to the backend. Entries are stored locally as a design preview and do not load executable code.
        </div>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-surface-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Plugin name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Plugin name"
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
          <input type="text" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} aria-label="Plugin description"
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
          <button onClick={handleAdd} disabled={!name.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Install</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
            <Puzzle size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No plugins installed</div>
          </div>
        ) : plugins.map((p) => (
          <div key={p.id} className="px-3 py-2 border-b border-border-subtle hover:bg-surface-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(p.id)} className="shrink-0" aria-label={p.enabled ? `Disable ${p.name}` : `Enable ${p.name}`}>
                {p.enabled ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-fg-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-fg-primary">{p.name} <span className="text-fg-muted">v{p.version}</span></div>
                <div className="text-[11px] text-fg-muted truncate">{p.description}</div>
                <div className="text-[10px] text-fg-muted mt-0.5">
                  {p.source} {p.author ? `· ${p.author}` : ""}
                  {p.skills.length > 0 && ` · ${p.skills.length} skills`}
                  {p.commands.length > 0 && ` · ${p.commands.length} commands`}
                  {p.hooks.length > 0 && ` · ${p.hooks.length} hooks`}
                  {p.mcpServers.length > 0 && ` · ${p.mcpServers.length} MCP`}
                </div>
              </div>
              <button onClick={() => uninstall(p.id)} className="p-1 text-fg-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast" aria-label={`Uninstall ${p.name}`}>
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
