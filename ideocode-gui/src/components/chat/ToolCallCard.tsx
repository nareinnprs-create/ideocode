import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import type { ToolCall } from "../../lib/tauri-commands";

interface Props {
  toolCall: ToolCall;
}

const STATUS_ICONS: Record<string, typeof Wrench> = {
  queued: Clock,
  running: Loader2,
  completed: CheckCircle2,
  error: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  queued: "text-text-muted",
  running: "text-info",
  completed: "text-success",
  error: "text-error",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "queued",
  running: "running",
  completed: "done",
  error: "error",
};

export function ToolCallCard({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status ?? "completed";
  const Icon = STATUS_ICONS[status] ?? Wrench;
  const colorClass = STATUS_COLORS[status] ?? "text-text-muted";
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "running") return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(timer);
  }, [status]);

  const elapsedText =
    status === "running" && elapsed > 0 ? `${(elapsed / 1000).toFixed(1)}s` : null;

  return (
    <div
      className={`my-1.5 rounded-lg border overflow-hidden bg-bg-secondary transition-colors ${
        status === "running" ? "border-accent-primary/40" : "border-border-subtle"
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-fast text-left"
      >
        <Icon
          size={14}
          className={`shrink-0 ${colorClass} ${status === "running" ? "animate-spin" : ""}`}
        />
        <span className="text-xs font-mono text-text-secondary flex-1 truncate">
          {toolCall.name}
        </span>
        {elapsedText && (
          <span className="text-[10px] text-text-muted font-mono tabular-nums">{elapsedText}</span>
        )}
        <span
          className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${colorClass} ${
            status === "running" ? "bg-info/10" : status === "error" ? "bg-error/10" : status === "completed" ? "bg-success/10" : "bg-bg-elevated"
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-text-muted" />
        ) : (
          <ChevronRight size={14} className="text-text-muted" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border-subtle">
          {/* Input */}
          <div className="px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
              Input
            </div>
            <pre className="text-xs font-mono text-text-secondary bg-bg-primary rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
              {formatJson(toolCall.input)}
            </pre>
          </div>

          {/* Output */}
          {toolCall.output && (
            <div className="px-3 py-2 border-t border-border-subtle">
              <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
                Output
              </div>
              <pre className="text-xs font-mono text-text-secondary bg-bg-primary rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
