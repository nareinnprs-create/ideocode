import { useState } from "react";
import { Timer, Trash2, Play, Pause } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useIdleTaskStore } from "../../stores/idleTaskStore";

export function IdleTasksPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const tasks = useIdleTaskStore((s) => s.queue);
  const enqueue = useIdleTaskStore((s) => s.enqueue);
  const cancel = useIdleTaskStore((s) => s.cancel);
  const pause = useIdleTaskStore((s) => s.pause);
  const resume = useIdleTaskStore((s) => s.resume);
  const remove = useIdleTaskStore((s) => s.remove);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");

  const handleAdd = () => {
    if (!title.trim() || !prompt.trim()) return;
    enqueue(title, prompt, model || undefined);
    setTitle("");
    setPrompt("");
    setModel("");
    setShowAdd(false);
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: "bg-info/10 text-info",
      running: "bg-success/10 text-success",
      paused: "bg-warning/10 text-warning",
      completed: "bg-surface-elevated text-fg-muted",
      failed: "bg-error/10 text-error",
      cancelled: "bg-surface-elevated text-fg-muted",
    };
    return colors[status] ?? "bg-surface-elevated text-fg-muted";
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Idle tasks panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated">
          <Timer size={14} /> Idle Tasks
        </button>
        <button onClick={() => setShowAdd(!showAdd)} aria-label="Add idle task" aria-expanded={showAdd} className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover transition-fast rounded hover:bg-surface-elevated">
          + Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-surface-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
          <textarea placeholder="Prompt to execute when idle..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
            className="w-full p-1.5 text-xs font-mono bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent resize-none" />
          <input type="text" placeholder="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)}
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
          <button onClick={handleAdd} disabled={!title.trim() || !prompt.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Enqueue Task</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
            <Timer size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No idle tasks in queue</div>
          </div>
        ) : tasks.map((t) => (
          <div key={t.id} className="px-3 py-2 border-b border-border-subtle hover:bg-surface-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor(t.status)}`}>{t.status}</span>
                  <span className="text-xs font-medium text-fg-primary">{t.title}</span>
                </div>
                <div className="text-[11px] text-fg-muted font-mono truncate mt-0.5">{t.prompt}</div>
                {t.model && <div className="text-[10px] text-fg-muted mt-0.5">model: {t.model}</div>}
                {t.error && <div className="text-[10px] text-error mt-0.5">{t.error}</div>}
                {t.progress && <div className="text-[10px] text-fg-muted mt-0.5">{t.progress}</div>}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                {t.status === "queued" && (
                  <button onClick={() => cancel(t.id)} className="p-1 text-fg-muted hover:text-warning transition-fast" title="Cancel">
                    <Pause size={11} />
                  </button>
                )}
                {t.status === "running" && (
                  <button onClick={() => pause(t.id)} className="p-1 text-fg-muted hover:text-warning transition-fast" title="Pause">
                    <Pause size={11} />
                  </button>
                )}
                {t.status === "paused" && (
                  <button onClick={() => resume(t.id)} className="p-1 text-fg-muted hover:text-success transition-fast" title="Resume">
                    <Play size={11} />
                  </button>
                )}
                {(t.status === "completed" || t.status === "failed" || t.status === "cancelled") && (
                  <button onClick={() => remove(t.id)} aria-label="Remove task" className="p-1 text-fg-muted hover:text-error transition-fast" title="Remove">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
