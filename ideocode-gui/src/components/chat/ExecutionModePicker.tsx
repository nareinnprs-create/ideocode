import { useEffect, useCallback } from "react";
import { Shield, Zap, BookOpen, Rocket } from "lucide-react";
import { useChatStore, type ExecutionMode } from "../../stores/chatStore";
import { Tooltip } from "../ui/Tooltip";

const MODES: { id: ExecutionMode; label: string; icon: typeof Zap; hint: string }[] = [
  { id: "confirm", label: "Confirm", icon: Shield, hint: "Ask before every change" },
  { id: "auto-edit", label: "Auto Edit", icon: Zap, hint: "Auto-apply file edits" },
  { id: "plan", label: "Plan", icon: BookOpen, hint: "Plan before acting" },
  { id: "full-access", label: "Full Access", icon: Rocket, hint: "Unrestricted autonomous mode" },
];

const MODE_ORDER: ExecutionMode[] = ["confirm", "auto-edit", "plan", "full-access"];

export function ExecutionModePicker() {
  const executionMode = useChatStore((s) => s.executionMode);
  const setExecutionMode = useChatStore((s) => s.setExecutionMode);

  const cycleMode = useCallback(() => {
    const idx = MODE_ORDER.indexOf(executionMode);
    const next = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
    setExecutionMode(next);
  }, [executionMode, setExecutionMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        cycleMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cycleMode]);

  return (
    <div className="flex items-center gap-1" role="tablist" aria-label="Execution mode">
      {MODES.map(({ id, label, icon: ModeIcon, hint }) => (
        <Tooltip key={id} label={hint}>
          <button
            onClick={() => setExecutionMode(id)}
            aria-pressed={executionMode === id}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
              executionMode === id
                ? "bg-accent-primary/12 text-accent-primary glow-soft"
                : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
            }`}
          >
            <ModeIcon size={13} />
            {label}
          </button>
        </Tooltip>
      ))}
      <span className="text-[10px] text-text-muted ml-1">
        <kbd className="px-1 py-0.5 rounded bg-bg-elevated/50 border border-border-subtle text-[9px]">Shift</kbd>
        +
        <kbd className="px-1 py-0.5 rounded bg-bg-elevated/50 border border-border-subtle text-[9px]">Tab</kbd>
      </span>
    </div>
  );
}
