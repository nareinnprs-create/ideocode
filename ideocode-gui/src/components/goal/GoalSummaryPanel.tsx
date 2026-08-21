import { useEffect, useState } from "react";
import {
  Target,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { useGoalStore, type GoalStatus } from "../../stores/goalStore";
import { Badge } from "../ui/Badge";
import { Progress } from "../ui/Progress";
import { Button } from "../ui/Button";

const STATUS_CONFIG: Record<GoalStatus, { label: string; tone: "default" | "success" | "warning" | "accent" }> = {
  idle: { label: "Idle", tone: "default" },
  in_progress: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  completed: { label: "Done", tone: "accent" },
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function GoalSummaryPanel() {
  const {
    goal,
    status,
    tasks,
    setGoal,
    startGoal,
    pauseGoal,
    clearGoal,
    toggleTaskDone,
  } = useGoalStore();

  const [editingObjective, setEditingObjective] = useState(false);
  const [draftObjective, setDraftObjective] = useState(goal);
  const [elapsed, setElapsed] = useState(0);
  const [budget, setBudget] = useState("");
  const [startTime] = useState(Date.now());

  const doneTasks = tasks.filter((t) => t.status === "done");
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (doneTasks.length / totalTasks) * 100 : 0;

  useEffect(() => {
    if (status !== "in_progress") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status, startTime]);

  const handleSaveObjective = () => {
    const trimmed = draftObjective.trim();
    if (trimmed && trimmed !== goal) {
      setGoal(trimmed);
    }
    setEditingObjective(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border-subtle surface-blur flex items-center gap-2">
        <Target size={14} className="text-accent" />
        <span className="text-xs font-semibold text-fg-primary">Goal Summary</span>
        {status !== "idle" && (
          <Badge tone={STATUS_CONFIG[status].tone} className="ml-auto">
            {STATUS_CONFIG[status].label}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-4">
        {status === "idle" && !goal ? (
          <div className="flex flex-col items-center justify-center h-full text-fg-muted text-xs space-y-2">
            <Target size={24} className="opacity-40" />
            <span>No active goal</span>
            <span className="text-[10px] opacity-60">Start a goal to track progress</span>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[10px] text-fg-muted uppercase tracking-wider mb-1">Objective</div>
              {editingObjective ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={draftObjective}
                    onChange={(e) => setDraftObjective(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveObjective();
                      if (e.key === "Escape") {
                        setDraftObjective(goal);
                        setEditingObjective(false);
                      }
                    }}
                    onBlur={handleSaveObjective}
                    className="flex-1 px-2 py-1 text-xs rounded border border-border-subtle bg-surface-elevated text-fg-primary focus:outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setDraftObjective(goal);
                    setEditingObjective(true);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs text-fg-primary rounded hover:bg-surface-hover transition-fast"
                >
                  {goal}
                </button>
              )}
            </div>

            {status !== "idle" && (
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <Clock size={12} />
                <span>{formatElapsed(elapsed)}</span>
                <span className="text-fg-muted/40">|</span>
                <span>{tasks.length} tasks</span>
                <span className="text-fg-muted/40">|</span>
                <span>Iteration 1</span>
              </div>
            )}

            {totalTasks > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-fg-muted">
                  <span>Progress</span>
                  <span>{doneTasks.length}/{totalTasks}</span>
                </div>
                <Progress value={doneTasks.length} max={totalTasks} tone={progress === 100 ? "success" : "accent"} />
              </div>
            )}

            <div className="space-y-1">
              <div className="text-[10px] text-fg-muted uppercase tracking-wider mb-1">Tasks</div>
              {tasks.length === 0 ? (
                <div className="text-[11px] text-fg-muted px-2 py-3 text-center">
                  No tasks yet
                </div>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTaskDone(task.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-hover transition-fast group"
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 size={14} className="text-success shrink-0" />
                    ) : task.status === "in_progress" ? (
                      <AlertTriangle size={14} className="text-warning shrink-0" />
                    ) : (
                      <Circle size={14} className="text-fg-muted shrink-0" />
                    )}
                    <span className={`flex-1 text-xs text-left ${task.status === "done" ? "line-through text-fg-muted" : "text-fg-primary"}`}>
                      {task.title}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div>
              <div className="text-[10px] text-fg-muted uppercase tracking-wider mb-1">Budget Limit</div>
              <div className="flex items-center gap-1.5">
                <DollarSign size={12} className="text-fg-muted" />
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Optional"
                  className="flex-1 px-2 py-1 text-xs rounded border border-border-subtle bg-surface-elevated text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {goal && (
        <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-1.5">
          {status === "idle" && (
            <Button size="xs" variant="primary" onClick={startGoal} leadingIcon={<Play size={11} />}>
              Start
            </Button>
          )}
          {status === "in_progress" && (
            <Button size="xs" variant="secondary" onClick={pauseGoal} leadingIcon={<Pause size={11} />}>
              Pause
            </Button>
          )}
          {status === "paused" && (
            <Button size="xs" variant="primary" onClick={startGoal} leadingIcon={<RotateCcw size={11} />}>
              Resume
            </Button>
          )}
          <div className="flex-1" />
          <Button size="xs" variant="danger" onClick={clearGoal} leadingIcon={<Trash2 size={11} />}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
