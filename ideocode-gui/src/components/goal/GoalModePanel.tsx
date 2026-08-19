import { useState } from "react";
import { Target, Play, Pause, CheckCircle2, Trash2 } from "lucide-react";
import { useGoalStore } from "../../stores/goalStore";
import { Button } from "../ui/Button";
import { GoalTaskList } from "./GoalTaskList";

export function GoalModePanel() {
  const {
    goal,
    status,
    tasks,
    setGoal,
    startGoal,
    pauseGoal,
    completeGoal,
    clearGoal,
    addTasksFromGoal,
  } = useGoalStore();

  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);

  const doneTasks = tasks.filter((t) => t.status === "done");
  const progress = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

  const handleSetGoal = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setGoal(trimmed);
    setInput("");
  };

  const handleGenerateTasks = async () => {
    if (!goal) return;
    setGenerating(true);
    try {
      const lines = goal
        .split(/[.\n]/)
        .map((l) => l.trim())
        .filter((l) => l.length > 3);
      const generated = lines.map((line, i) => ({
        title: line.charAt(0).toUpperCase() + line.slice(1),
        description: "",
        priority: (i === 0 ? "high" : i < lines.length / 2 ? "medium" : "low") as "high" | "medium" | "low",
      }));
      if (generated.length > 0) {
        addTasksFromGoal(generated);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2">
        <Target size={14} className="text-accent-primary" />
        <span className="text-xs font-semibold text-text-primary">Goal Mode</span>
        {status !== "idle" && (
          <span
            className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              status === "in_progress"
                ? "bg-success/10 text-success"
                : status === "paused"
                  ? "bg-warning/10 text-warning"
                  : "bg-accent-primary/10 text-accent-primary"
            }`}
          >
            {status === "in_progress" ? "Active" : status === "paused" ? "Paused" : "Done"}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-3">
        {!goal ? (
          <div className="space-y-3">
            <p className="text-[11px] text-text-muted leading-relaxed">
              Define your high-level goal. The agent will break it into tasks and work through them systematically.
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSetGoal();
                }
              }}
              placeholder="What do you want to accomplish?"
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border-subtle bg-bg-tertiary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary resize-none"
            />
            <Button size="sm" onClick={handleSetGoal} disabled={!input.trim()} fullWidth>
              Set Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
              <p className="text-xs text-text-primary leading-relaxed">{goal}</p>
            </div>

            {tasks.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted font-mono">
                    {doneTasks.length}/{tasks.length}
                  </span>
                </div>
              </div>
            )}

            <GoalTaskList />
          </div>
        )}
      </div>

      {goal && (
        <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-1.5">
          {status === "idle" && (
            <>
              <Button size="xs" variant="primary" onClick={startGoal} leadingIcon={<Play size={11} />}>
                Start
              </Button>
              <Button
                size="xs"
                variant="secondary"
                onClick={handleGenerateTasks}
                loading={generating}
                loadingText="Generating..."
              >
                Auto-Generate Tasks
              </Button>
            </>
          )}
          {status === "in_progress" && (
            <Button size="xs" variant="secondary" onClick={pauseGoal} leadingIcon={<Pause size={11} />}>
              Pause
            </Button>
          )}
          {status === "paused" && (
            <Button size="xs" variant="primary" onClick={startGoal} leadingIcon={<Play size={11} />}>
              Resume
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="xs"
            variant="ghost"
            onClick={completeGoal}
            leadingIcon={<CheckCircle2 size={11} />}
          >
            Complete
          </Button>
          <Button size="xs" variant="danger" onClick={clearGoal} leadingIcon={<Trash2 size={11} />}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
