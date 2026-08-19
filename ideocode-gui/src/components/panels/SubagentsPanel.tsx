import { useState } from "react";
import { Users, Trash2, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { streamChat } from "../../lib/tauri-commands";
import { EmptyState } from "../ui/EmptyState";

interface Subagent {
  id: string;
  name: string;
  status: "idle" | "running" | "completed" | "failed";
  task: string;
  result?: string;
  error?: string;
  createdAt: number;
}

const STORAGE_KEY = "idc-subagents";
function loadSubagents(): Subagent[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveSubagents(items: Subagent[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

const STATUS_COLORS = { idle: "text-text-muted", running: "text-accent-primary", completed: "text-success", failed: "text-error" };

export function SubagentsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [agents, setAgents] = useState<Subagent[]>(loadSubagents);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  const updateAgent = (id: string, updates: Partial<Subagent>) => {
    setAgents((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      saveSubagents(next);
      return next;
    });
  };

  const handleSpawn = async () => {
    if (!taskInput.trim() || runningIds.size > 0) return;
    const id = `sub-${Date.now()}`;
    const agent: Subagent = {
      id,
      name: nameInput.trim() || `Agent ${agents.length + 1}`,
      status: "running",
      task: taskInput,
      createdAt: Date.now(),
    };
    const next = [...agents, agent];
    setAgents(next);
    saveSubagents(next);
    setTaskInput("");
    setNameInput("");
    setRunningIds((prev) => new Set(prev).add(id));

    try {
      const message = await streamChat(agent.task, { mode: "agent" });
      updateAgent(id, {
        status: "completed",
        result: message.content || "Agent completed.",
      });
    } catch (e) {
      updateAgent(id, {
        status: "failed",
        error: String(e),
      });
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const remove = (id: string) => {
    const next = agents.filter((a) => a.id !== id);
    setAgents(next);
    saveSubagents(next);
    setRunningIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const retry = async (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent || runningIds.size > 0) return;
    updateAgent(id, { status: "running", result: undefined, error: undefined });
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      const message = await streamChat(agent.task, { mode: "agent" });
      updateAgent(id, {
        status: "completed",
        result: message.content || "Agent completed.",
      });
    } catch (e) {
      updateAgent(id, {
        status: "failed",
        error: String(e),
      });
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const isRunning = runningIds.size > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Users size={14} /> Subagents
        </button>
      </div>
      <div className="px-3 py-2 border-b border-border-subtle space-y-1.5">
        <input type="text" placeholder="Agent name (optional)" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
          className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
        <textarea placeholder="What should the subagent do?" value={taskInput} onChange={(e) => setTaskInput(e.target.value)} rows={2}
          className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary resize-none" />
        <button onClick={handleSpawn} disabled={!taskInput.trim() || isRunning}
          className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">
          {isRunning ? "Running..." : "Spawn Subagent"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {agents.length === 0 ? (
          <EmptyState icon={<Users size={24} />} title="No subagents" description="Spawn a subagent to handle tasks in parallel" />
        ) : (
          agents.map((a) => (
            <div key={a.id} className="border-b border-border-subtle group">
              <div onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                className="px-3 py-2 hover:bg-bg-elevated cursor-pointer transition-fast flex items-center gap-2">
                <ChevronRight size={12} className={`text-text-muted transition-transform ${expandedId === a.id ? "rotate-90" : ""}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-primary">{a.name}</span>
                    <span className={`text-[10px] font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                    {a.status === "running" && <Loader2 size={11} className="text-accent-primary animate-spin" />}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">{a.task}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(a.id); }}
                  className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                  <Trash2 size={11} />
                </button>
              </div>
              {expandedId === a.id && (
                <div className="px-6 pb-2 text-[11px] text-text-secondary">
                  <div className="mb-1 font-medium">Task:</div>
                  <div className="whitespace-pre-wrap bg-bg-tertiary p-2 rounded">{a.task}</div>
                  {a.error && (
                    <div className="mt-2 flex items-start gap-1.5">
                      <AlertCircle size={11} className="text-error shrink-0 mt-0.5" />
                      <div className="whitespace-pre-wrap text-error">{a.error}</div>
                    </div>
                  )}
                  {a.result && (<>
                    <div className="mt-2 mb-1 font-medium">Result:</div>
                    <div className="whitespace-pre-wrap bg-bg-tertiary p-2 rounded">{a.result}</div>
                  </>)}
                  {a.status === "failed" && (
                    <button onClick={() => retry(a.id)}
                      className="mt-2 flex items-center gap-1 px-2 py-1 text-[11px] text-accent-primary hover:bg-bg-elevated rounded transition-fast">
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
