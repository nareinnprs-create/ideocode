import { useState, useEffect, useCallback } from "react";
import { Keyboard, Plus, Trash2, Download, Upload, AlertTriangle } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";

interface Shortcut { id: string; action: string; keys: string; }
const STORAGE_KEY = "idc-shortcuts";

function loadShortcuts(): Shortcut[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveShortcuts(items: Shortcut[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const DEFAULTS: Shortcut[] = [
  { id: "d1", action: "Command Palette", keys: "Cmd+K" },
  { id: "d2", action: "Toggle Sidebar", keys: "Cmd+B" },
  { id: "d3", action: "Toggle Right Panel", keys: "Cmd+\\" },
  { id: "d4", action: "Toggle Bottom Panel", keys: "Cmd+J" },
  { id: "d5", action: "Open Terminal", keys: "Cmd+`" },
  { id: "d6", action: "New Chat", keys: "Cmd+N" },
  { id: "d7", action: "Save File", keys: "Cmd+S" },
  { id: "d8", action: "Quick Open File", keys: "Cmd+P" },
  { id: "d9", action: "Toggle Composer", keys: "Cmd+I" },
];

const ACTION_MAP: Record<string, () => void> = {};

function registerActions() {
  const app = useAppStore.getState();
  const chat = useChatStore.getState();
  const file = useFileStore.getState();
  ACTION_MAP["Command Palette"] = () => app.toggleCommandPalette();
  ACTION_MAP["Toggle Sidebar"] = () => app.toggleSidebar();
  ACTION_MAP["Toggle Right Panel"] = () => app.toggleRightPanel();
  ACTION_MAP["Toggle Bottom Panel"] = () => app.toggleBottomPanel();
  ACTION_MAP["Open Terminal"] = () => { app.setBottomPanel("terminal"); app.setBottomPanelOpen(true); };
  ACTION_MAP["New Chat"] = () => { void chat.clearMessages(); };
  ACTION_MAP["Save File"] = () => { void file.saveFile(); };
  ACTION_MAP["Quick Open File"] = () => app.setFileQuickOpenOpen(!app.fileQuickOpenOpen);
  ACTION_MAP["Toggle Composer"] = () => app.setComposerOpen(!app.composerOpen);
}

function findConflicts(shortcuts: Shortcut[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>();
  const byKeys = new Map<string, string[]>();
  for (const s of shortcuts) {
    const key = s.keys.toLowerCase().replace(/\s/g, "");
    const list = byKeys.get(key) ?? [];
    list.push(s.action);
    byKeys.set(key, list);
  }
  for (const [key, actions] of byKeys) {
    if (actions.length > 1) {
      conflicts.set(key, actions);
    }
  }
  return conflicts;
}

export function KeyboardShortcutsPanel() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    const s = loadShortcuts();
    return s.length > 0 ? s : DEFAULTS;
  });
  const [showAdd, setShowAdd] = useState(false);
  const [action, setAction] = useState("");
  const [keys, setKeys] = useState("");
  const [listening, setListening] = useState(false);
  const [conflicts, setConflicts] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    registerActions();
    setConflicts(findConflicts(shortcuts));
  }, [shortcuts]);

  const handleAdd = () => {
    if (!action.trim() || !keys.trim()) return;
    const next = [...shortcuts, { id: `sc-${Date.now()}`, action, keys }];
    setShortcuts(next);
    saveShortcuts(next);
    setAction("");
    setKeys("");
    setShowAdd(false);
  };

  const remove = (id: string) => {
    const next = shortcuts.filter((s) => s.id !== id);
    setShortcuts(next);
    saveShortcuts(next);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!listening) return;
    e.preventDefault();
    e.stopPropagation();
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push(e.metaKey ? "Cmd" : "Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    if (e.key && !["Control", "Meta", "Shift", "Alt"].includes(e.key)) {
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    setKeys(parts.join("+"));
    setListening(false);
  }, [listening]);

  useEffect(() => {
    if (listening) {
      window.addEventListener("keydown", handleKeyDown, true);
      return () => window.removeEventListener("keydown", handleKeyDown, true);
    }
  }, [listening, handleKeyDown]);

  const exportShortcuts = () => {
    const blob = new Blob([JSON.stringify(shortcuts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ideocode-shortcuts.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importShortcuts = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string) as Shortcut[];
          if (Array.isArray(imported)) {
            setShortcuts(imported);
            saveShortcuts(imported);
          }
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Keyboard shortcuts">
      <div className="px-3 pt-2 pb-1 flex items-center justify-between border-b border-border-subtle surface-blur">
        <span className="flex items-center gap-1.5 text-xs font-medium text-fg-primary">
          <Keyboard size={14} /> Shortcuts
        </span>
        <div className="flex items-center gap-1">
          <button onClick={exportShortcuts} className="p-1 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated" aria-label="Export shortcuts">
            <Download size={13} />
          </button>
          <button onClick={importShortcuts} className="p-1 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated" aria-label="Import shortcuts">
            <Upload size={13} />
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover transition-fast rounded hover:bg-surface-elevated">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {conflicts.size > 0 && (
        <div className="mx-3 mt-2 p-2 rounded bg-warning/10 border border-warning/30">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
            <div className="text-[11px] text-warning">
              {conflicts.size} key conflict{conflicts.size > 1 ? "s" : ""} detected
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-surface-elevated border border-border-subtle space-y-1.5">
          <input
            type="text"
            placeholder="Action name"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Action name"
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent"
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder={listening ? "Press keys…" : "Shortcut (e.g. Cmd+K)"}
              value={keys}
              onChange={(e) => setKeys(e.target.value)}
              onFocus={() => setListening(true)}
              readOnly={listening}
              className="flex-1 p-1.5 text-xs font-mono bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => setListening(!listening)}
              className={`px-2 text-[10px] rounded border transition-fast ${listening ? "bg-accent text-white border-accent" : "bg-surface-elevated text-fg-muted border-border-subtle hover:text-fg-primary"}`}
            >
              {listening ? "Listening…" : "Record"}
            </button>
          </div>
          <button onClick={handleAdd} disabled={!action.trim() || !keys.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">
            Add
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {shortcuts.map((s) => {
          const key = s.keys.toLowerCase().replace(/\s/g, "");
          const hasConflict = conflicts.has(key);
          return (
            <div key={s.id} className="px-3 py-2 border-b border-border-subtle hover:bg-surface-elevated transition-fast group flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-fg-primary truncate">{s.action}</span>
                {hasConflict && <AlertTriangle size={11} className="text-warning shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                <kbd className="text-[10px] font-mono text-fg-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-border-subtle">{s.keys}</kbd>
                <button onClick={() => remove(s.id)} className="p-1 text-fg-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
