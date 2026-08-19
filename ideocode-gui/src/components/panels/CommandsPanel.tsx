import { useState } from "react";
import { Terminal, Plus, Trash2, Play } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { Modal } from "../ui/Modal";
import { eventBus } from "../../lib/eventBus";

interface Command {
  id: string;
  name: string;
  description: string;
  command: string;
  shortcut?: string;
}

const STORAGE_KEY = "idc-commands";
function loadCommands(): Command[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveCommands(items: Command[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export function CommandsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [commands, setCommands] = useState<Command[]>(loadCommands);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cmd, setCmd] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [runTarget, setRunTarget] = useState<Command | null>(null);

  const handleAdd = () => {
    if (!name.trim() || !cmd.trim()) return;
    const next = [...commands, { id: `cmd-${Date.now()}`, name, description: desc, command: cmd, shortcut: shortcut || undefined }];
    setCommands(next);
    saveCommands(next);
    setName(""); setDesc(""); setCmd(""); setShortcut(""); setShowAdd(false);
  };

  const remove = (id: string) => {
    const next = commands.filter((c) => c.id !== id);
    setCommands(next);
    saveCommands(next);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Terminal size={14} /> Commands
        </button>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated">
          <Plus size={14} /> Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Command name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Shell command" value={cmd} onChange={(e) => setCmd(e.target.value)}
            className="w-full p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Keyboard shortcut (optional)" value={shortcut} onChange={(e) => setShortcut(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <button onClick={handleAdd} disabled={!name.trim() || !cmd.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">
            Create Command
          </button>
        </div>
      )}
      <Modal open={runTarget !== null} onClose={() => setRunTarget(null)} title="Run Command">
        <div className="space-y-3">
          <div className="text-xs text-text-secondary">
            Execute <span className="font-mono text-text-primary">{runTarget?.command}</span>?
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setRunTarget(null)} className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">Cancel</button>
            <button onClick={() => {
              const command = runTarget?.command || "";
              eventBus.emit("output", `[Command] ${command}\n`);
              eventBus.emit("output", `> Executed at ${new Date().toLocaleTimeString()}\n`);
              useAppStore.getState().setBottomPanel("terminal");
              useAppStore.getState().setBottomPanelOpen(true);
              setRunTarget(null);
            }} className="px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover transition-fast">Run</button>
          </div>
        </div>
      </Modal>
      <div className="flex-1 overflow-y-auto">
        {commands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Terminal size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No custom commands</div>
          </div>
        ) : (
          commands.map((c) => (
            <div key={c.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group flex items-center gap-2">
              <Play size={12} className="text-accent-primary shrink-0" />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setRunTarget(c)}>
                <div className="text-xs font-medium text-text-primary">{c.name}</div>
                <div className="text-[11px] text-text-muted font-mono truncate">{c.command}</div>
              </div>
              {c.shortcut && <span className="text-[10px] font-mono text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">{c.shortcut}</span>}
              <button onClick={() => remove(c.id)} className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
