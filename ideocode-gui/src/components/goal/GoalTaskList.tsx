import { Plus, Circle, CheckCircle2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useGoalStore, type Task, type TaskStatus } from "../../stores/goalStore";
import { ContextMenu } from "../ui/ContextMenu";

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "text-text-muted",
  in_progress: "text-accent-primary",
  blocked: "text-warning",
  done: "text-success",
};

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  high: "bg-error/15 text-error",
  medium: "bg-warning/15 text-warning",
  low: "bg-info/15 text-info",
};

export function GoalTaskList() {
  const { tasks, addTask, removeTask, updateTask } = useGoalStore();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, description: "", status: "pending", priority: "medium", dependencies: [] });
    setNewTitle("");
    setAdding(false);
  };

  const cycleStatus = (task: Task) => {
    const order: TaskStatus[] = ["pending", "in_progress", "blocked", "done"];
    const idx = order.indexOf(task.status);
    const next = order[(idx + 1) % order.length];
    updateTask(task.id, { status: next, completedAt: next === "done" ? Date.now() : undefined });
  };

  const cyclePriority = (task: Task) => {
    const order: Task["priority"][] = ["low", "medium", "high"];
    const idx = order.indexOf(task.priority);
    updateTask(task.id, { priority: order[(idx + 1) % order.length] });
  };

  if (tasks.length === 0 && !adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
      >
        <Plus size={12} />
        Add a task
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <ContextMenu
          key={task.id}
          items={[
            { id: "status", label: "Cycle status", onSelect: () => cycleStatus(task) },
            { id: "priority", label: "Cycle priority", onSelect: () => cyclePriority(task) },
            { id: "sep", label: "", separator: true },
            { id: "delete", label: "Delete task", danger: true, onSelect: () => removeTask(task.id) },
          ]}
        >
          <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-hover transition-colors">
            <button onClick={() => cycleStatus(task)} className={`shrink-0 ${STATUS_COLORS[task.status]}`}>
              {task.status === "done" ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </button>
            <span className={`flex-1 text-xs leading-snug ${task.status === "done" ? "line-through text-text-muted" : "text-text-primary"}`}>
              {task.title}
            </span>
            <button onClick={() => cyclePriority(task)} className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority[0].toUpperCase()}
            </button>
            <button onClick={() => removeTask(task.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all">
              <Trash2 size={11} />
            </button>
          </div>
        </ContextMenu>
      ))}
      {adding ? (
        <div className="flex items-center gap-1.5 px-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
            onBlur={() => { if (!newTitle.trim()) setAdding(false); else handleAdd(); }}
            placeholder="Task title..."
            className="flex-1 px-2 py-1 text-xs rounded border border-border-subtle bg-bg-tertiary text-text-primary focus:outline-none focus:border-accent-primary"
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
        >
          <Plus size={11} />
          Add task
        </button>
      )}
    </div>
  );
}
