import { Target, Pause, Play, Trash2, RefreshCw } from "lucide-react";

interface GoalCommandHandlerProps {
  input: string;
  onCommand: (cmd: string, args: string) => void;
}

interface ParsedGoalCommand {
  action: "set" | "pause" | "resume" | "clear" | "replace";
  args: string;
  description: string;
}

function parseGoalCommand(input: string): ParsedGoalCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/goal")) return null;

  const afterGoal = trimmed.slice(5).trim();

  if (afterGoal === "" || afterGoal === "help") {
    return {
      action: "set",
      args: "",
      description: "Set a new goal: /goal <objective>",
    };
  }

  if (afterGoal === "pause") {
    return {
      action: "pause",
      args: "",
      description: "Pause the current goal",
    };
  }

  if (afterGoal === "resume") {
    return {
      action: "resume",
      args: "",
      description: "Resume the paused goal",
    };
  }

  if (afterGoal === "clear") {
    return {
      action: "clear",
      args: "",
      description: "Clear the current goal and all tasks",
    };
  }

  if (afterGoal.startsWith("replace")) {
    const newObjective = afterGoal.slice(7).trim();
    return {
      action: "replace",
      args: newObjective,
      description: newObjective
        ? `Replace goal with: "${newObjective}"`
        : "Replace goal: /goal replace <new objective>",
    };
  }

  return {
    action: "set",
    args: afterGoal,
    description: `Set goal: "${afterGoal}"`,
  };
}

const ACTION_ICONS: Record<string, typeof Target> = {
  set: Target,
  pause: Pause,
  resume: Play,
  clear: Trash2,
  replace: RefreshCw,
};

export function GoalCommandHandler({ input, onCommand }: GoalCommandHandlerProps) {
  const parsed = parseGoalCommand(input);
  if (!parsed) return null;

  const Icon = ACTION_ICONS[parsed.action] ?? Target;

  const actionLabels: Record<string, string> = {
    set: "Set Goal",
    pause: "Pause Goal",
    resume: "Resume Goal",
    clear: "Clear Goal",
    replace: "Replace Goal",
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-30 mx-4">
      <div
        className="rounded-lg border border-accent/30 bg-surface shadow-xl animate-scale-in p-2.5 cursor-pointer hover:border-accent/50 transition-fast"
        onClick={() => onCommand(parsed.action, parsed.args)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
            <Icon size={13} className="text-accent" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-accent">{actionLabels[parsed.action]}</div>
            <div className="text-[11px] text-fg-muted truncate">{parsed.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
