import { useState, useEffect } from "react";
import { Anchor, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";

const HOOK_EVENTS = [
  "pre_prompt",
  "post_prompt",
  "pre_tool_call",
  "post_tool_call",
  "pre_file_edit",
  "post_file_edit",
  "on_error",
];

const EVENT_LABELS: Record<string, string> = {
  pre_prompt: "Before Prompt",
  post_prompt: "After Prompt",
  pre_tool_call: "Before Tool Call",
  post_tool_call: "After Tool Call",
  pre_file_edit: "Before File Edit",
  post_file_edit: "After File Edit",
  on_error: "On Error",
};

interface Hook {
  id: string;
  event: string;
  command: string;
  description: string;
  enabled: boolean;
}

export function HooksPanel() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newHook, setNewHook] = useState({ event: "pre_prompt", command: "", description: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadHooks(); }, []);

  const loadHooks = async () => {
    setLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<Hook[]>("list_hooks");
      setHooks(result);
    } catch { setHooks([]); }
    setLoading(false);
  };

  const createHook = async () => {
    if (!newHook.command) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const hook = await invoke<Hook>("create_hook", { ...newHook });
      setHooks((prev) => [...prev, hook]);
      setNewHook({ event: "pre_prompt", command: "", description: "" });
      setShowCreate(false);
    } catch (e) { setError(`Failed: ${e}`); }
  };

  const toggleHook = async (id: string, enabled: boolean) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("toggle_hook", { id, enabled });
      setHooks((prev) => prev.map((h) => (h.id === id ? { ...h, enabled } : h)));
    } catch (e) { setError(`Failed: ${e}`); }
  };

  const deleteHook = async (id: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_hook", { id });
      setHooks((prev) => prev.filter((h) => h.id !== id));
    } catch (e) { setError(`Failed: ${e}`); }
  };

  const eventColor = (event: string) => {
    const colors: Record<string, string> = {
      pre_prompt: "bg-blue-500/20 text-blue-400",
      post_prompt: "bg-green-500/20 text-green-400",
      pre_tool_call: "bg-amber-500/20 text-amber-400",
      post_tool_call: "bg-purple-500/20 text-purple-400",
      pre_file_edit: "bg-cyan-500/20 text-cyan-400",
      post_file_edit: "bg-teal-500/20 text-teal-400",
      on_error: "bg-red-500/20 text-red-400",
    };
    return colors[event] ?? "bg-bg-surface text-text-muted";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Anchor size={13} /> Hooks
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowCreate(!showCreate)} className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
            <Plus size={14} />
          </button>
          <button onClick={loadHooks} disabled={loading} className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-2 p-2 rounded bg-error/10 border border-error/30 flex items-center gap-2">
          <AlertCircle size={12} className="text-error shrink-0" />
          <div className="text-xs text-error flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-error">×</button>
        </div>
      )}

      {showCreate && (
        <div className="mx-3 mt-2 p-3 rounded border border-border-subtle bg-bg-surface space-y-2">
          <select value={newHook.event} onChange={(e) => setNewHook({ ...newHook, event: e.target.value })} className="w-full bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle outline-none focus:border-accent-primary">
            {HOOK_EVENTS.map((e) => <option key={e} value={e}>{EVENT_LABELS[e]}</option>)}
          </select>
          <input value={newHook.command} onChange={(e) => setNewHook({ ...newHook, command: e.target.value })} placeholder="Shell command or script" className="w-full bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-text-muted outline-none focus:border-accent-primary" />
          <input value={newHook.description} onChange={(e) => setNewHook({ ...newHook, description: e.target.value })} placeholder="Description (optional)" className="w-full bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-text-muted outline-none focus:border-accent-primary" />
          <div className="flex justify-end gap-1">
            <button onClick={() => setShowCreate(false)} className="px-2 py-1 text-[11px] rounded bg-bg-elevated text-text-secondary">Cancel</button>
            <button onClick={createHook} disabled={!newHook.command} className="px-2 py-1 text-[11px] rounded bg-accent-primary text-white disabled:opacity-50">Create</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {hooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <Anchor size={24} className="opacity-30" />
            <div className="text-xs">No hooks configured</div>
            <button onClick={() => setShowCreate(true)} className="text-[11px] text-accent-primary hover:underline">Create one</button>
          </div>
        ) : (
          hooks.map((hook) => (
            <div key={hook.id} className="flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-fast border-b border-border-subtle/50">
              <button onClick={() => toggleHook(hook.id, !hook.enabled)} className={`shrink-0 transition-fast ${hook.enabled ? "text-green-400" : "text-text-muted"}`}>
                {hook.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${eventColor(hook.event)}`}>{EVENT_LABELS[hook.event]}</span>
                </div>
                <div className="text-[10px] text-text-muted font-mono truncate mt-0.5">{hook.command}</div>
                {hook.description && <div className="text-[10px] text-text-secondary mt-0.5">{hook.description}</div>}
              </div>
              <button onClick={() => deleteHook(hook.id)} className="p-1 text-text-muted hover:text-red-400 transition-fast shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
