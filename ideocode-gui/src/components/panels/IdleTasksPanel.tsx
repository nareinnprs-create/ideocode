import { useState, useEffect } from "react";
import { Timer, ToggleLeft, ToggleRight, Trash2, Clock, Play } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useChatStore } from "../../stores/chatStore";

interface IdleTask { id: string; name: string; command: string; interval: number; enabled: boolean; lastRun?: number; }
const STORAGE_KEY = "idc-idle-tasks";
function loadTasks(): IdleTask[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveTasks(items: IdleTask[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export function IdleTasksPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [tasks, setTasks] = useState<IdleTask[]>(loadTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [interval, setInterval_] = useState("300");

  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];
    for (const task of tasks) {
      if (task.enabled && task.interval > 0) {
        const timer = setInterval(() => {
          useChatStore.getState().sendMessage(`[Idle Task: ${task.name}] ${task.command}`);
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, lastRun: Date.now() } : t));
        }, task.interval * 1000);
        timers.push(timer);
      }
    }
    return () => timers.forEach(clearInterval);
  }, [tasks]);

  const handleAdd = () => {
    if (!name.trim() || !command.trim()) return;
    const next = [...tasks, { id: `idle-${Date.now()}`, name, command, interval: parseInt(interval) || 300, enabled: true }];
    setTasks(next); saveTasks(next); setName(""); setCommand(""); setShowAdd(false);
  };
  const toggle = (id: string) => { const next = tasks.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t); setTasks(next); saveTasks(next); };
  const remove = (id: string) => { const next = tasks.filter((t) => t.id !== id); setTasks(next); saveTasks(next); };
  const runNow = (task: IdleTask) => {
    useChatStore.getState().sendMessage(`[Idle Task: ${task.name}] ${task.command}`);
    const next = tasks.map(t => t.id === task.id ? { ...t, lastRun: Date.now() } : t);
    setTasks(next); saveTasks(next);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Timer size={14} /> Idle Tasks
        </button>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated">
          + Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Command to run" value={command} onChange={(e) => setCommand(e.target.value)}
            className="w-full p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="number" placeholder="Interval (seconds)" value={interval} onChange={(e) => setInterval_(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <button onClick={handleAdd} disabled={!name.trim() || !command.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Add Task</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Timer size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No idle tasks configured</div>
          </div>
        ) : tasks.map((t) => (
          <div key={t.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(t.id)} className="shrink-0">
                {t.enabled ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-text-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">{t.name}</div>
                <div className="text-[11px] text-text-muted font-mono truncate">{t.command}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] text-text-muted flex items-center gap-1"><Clock size={10} />{t.interval}s</span>
                {t.lastRun && <span className="text-[10px] text-text-muted">Last: {new Date(t.lastRun).toLocaleTimeString()}</span>}
              </div>
              <button onClick={() => runNow(t)} className="p-1 text-text-muted hover:text-accent-primary opacity-0 group-hover:opacity-100 transition-fast" title="Run now"><Play size={11} /></button>
              <button onClick={() => remove(t.id)} className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast"><Trash2 size={11} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
