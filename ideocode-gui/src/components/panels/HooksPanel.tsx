import { useState } from "react";
import { Anchor, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useHookStore, type HookEvent } from "../../stores/hookStore";

const HOOK_EVENTS: HookEvent[] = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
];

const EVENT_LABELS: Record<HookEvent, string> = {
  SessionStart: "Session Start",
  UserPromptSubmit: "Prompt Submit",
  PreToolUse: "Before Tool Use",
  PermissionRequest: "Permission Request",
  PostToolUse: "After Tool Use",
  PostToolUseFailure: "Tool Use Failure",
  Stop: "Stop",
};

const EVENT_COLORS: Record<HookEvent, string> = {
  SessionStart: "bg-info/20 text-info",
  UserPromptSubmit: "bg-success/20 text-success",
  PreToolUse: "bg-amber-500/20 text-amber-400",
  PermissionRequest: "bg-orange-500/20 text-orange-400",
  PostToolUse: "bg-purple-500/20 text-purple-400",
  PostToolUseFailure: "bg-error/20 text-error",
  Stop: "bg-gray-500/20 text-gray-400",
};

export function HooksPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const hooks = useHookStore((s) => s.hooks);
  const addHook = useHookStore((s) => s.add);
  const toggleHook = useHookStore((s) => s.toggle);
  const removeHook = useHookStore((s) => s.remove);
  const [showAdd, setShowAdd] = useState(false);
  const [event, setEvent] = useState<HookEvent>("PreToolUse");
  const [command, setCommand] = useState("");
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!command.trim()) return;
    addHook({
      name: name || `${EVENT_LABELS[event]} hook`,
      event,
      matcher: { type: "wildcard", patterns: ["*"] },
      command,
      enabled: true,
      async: true,
      timeout: 30,
    });
    setCommand("");
    setName("");
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Anchor size={14} /> Hooks
        </button>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated">
          <Plus size={14} /> Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle space-y-1.5">
          <select value={event} onChange={(e) => setEvent(e.target.value as HookEvent)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary">
            {HOOK_EVENTS.map((ev) => <option key={ev} value={ev}>{EVENT_LABELS[ev]}</option>)}
          </select>
          <input type="text" placeholder="Hook name (optional)" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Shell command or script" value={command} onChange={(e) => setCommand(e.target.value)}
            className="w-full p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <button onClick={handleAdd} disabled={!command.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Create Hook</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {hooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Anchor size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No hooks configured</div>
          </div>
        ) : hooks.map((h) => (
          <div key={h.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleHook(h.id)} className="shrink-0">
                {h.enabled ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-text-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${EVENT_COLORS[h.event]}`}>{EVENT_LABELS[h.event]}</span>
                  <span className="text-xs font-medium text-text-primary">{h.name}</span>
                </div>
                <div className="text-[11px] text-text-muted font-mono truncate mt-0.5">{h.command}</div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {h.async ? "async" : "sync"} · {h.timeout}s timeout
                  {h.matcher.patterns.length > 0 && ` · patterns: ${h.matcher.patterns.join(", ")}`}
                </div>
              </div>
              <button onClick={() => removeHook(h.id)} className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
