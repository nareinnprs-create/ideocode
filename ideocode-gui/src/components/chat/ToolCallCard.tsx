import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import type { ToolCall } from "../../lib/tauri-commands";
import { approveTools, denyTools } from "../../lib/tauri-commands";

interface Props {
  toolCall: ToolCall;
}

const STATUS_ICONS: Record<string, typeof Wrench> = {
  queued: Clock,
  running: Loader2,
  completed: CheckCircle2,
  error: AlertCircle,
  pending_approval: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  queued: "text-fg-muted",
  running: "text-info",
  completed: "text-success",
  error: "text-error",
  pending_approval: "text-warning",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "queued",
  running: "running",
  completed: "done",
  error: "error",
  pending_approval: "awaiting approval",
};

const TOOL_COLORS: Record<string, string> = {
  thinking: "#dfa88f",
  plan: "#dfa88f",
  grep: "#9fc9a2",
  search: "#9fc9a2",
  read: "#9fbbe0",
  list: "#9fbbe0",
  view: "#9fbbe0",
  write: "#c0a8dd",
  edit: "#c0a8dd",
  patch: "#c0a8dd",
  bash: "#c6b89a",
  run: "#c6b89a",
  shell: "#c6b89a",
};

function toolColor(name: string): string {
  const key = Object.keys(TOOL_COLORS).find((k) => name.toLowerCase().includes(k));
  return key ? TOOL_COLORS[key] : "#8a8f98";
}

export function ToolCallCard({ toolCall }: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status ?? "completed";
  const Icon = STATUS_ICONS[status] ?? Wrench;
  const colorClass = STATUS_COLORS[status] ?? "text-fg-muted";
  const nameColor = toolColor(toolCall.name);
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
      className={`my-1.5 rounded-lg border overflow-hidden surface-blur bg-surface/70 transition-all duration-200 ${
        status === "running"
          ? "border-accent/30 glow-soft"
          : "border-border-subtle hover:border-border-default"
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover transition-fast text-left"
      >
        <Icon
          size={14}
          className={`shrink-0 ${colorClass} ${status === "running" ? "animate-spin" : ""}`}
        />
        <span className="text-xs font-mono flex-1 truncate" style={{ color: nameColor }}>
          {toolCall.name}
        </span>
        {elapsedText && (
          <span className="text-[11px] text-fg-muted font-mono tabular-nums">{elapsedText}</span>
        )}
        <span className="flex items-center gap-1.5">
          <span className={`w-[5px] h-[5px] rounded-full ${colorClass} ${status === "running" ? "status-dot animate-pulse-glow" : ""}`} />
          <span className={`text-[11px] font-medium ${colorClass}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-fg-muted" />
        ) : (
          <ChevronRight size={14} className="text-fg-muted" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border-subtle">
          {/* Input */}
          <div className="px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1">
              Input
            </div>
            <pre className="text-xs font-mono text-fg-secondary bg-surface rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
              {formatJson(toolCall.input)}
            </pre>
          </div>

          {/* Output */}
          {toolCall.output && (
            <div className="px-3 py-2 border-t border-border-subtle">
              <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1">
                Output
              </div>
              <pre className="text-xs font-mono text-fg-secondary bg-surface rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                {toolCall.output}
              </pre>
            </div>
          )}

          {/* Pending Approval Controls */}
          {status === "pending_approval" && (
            <div className="px-3 py-2 border-t border-border-subtle flex items-center justify-end gap-2 bg-surface/50">
              <button
                onClick={() => void denyTools()}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-fg-secondary bg-surface-elevated border border-border-subtle hover:text-fg-primary hover:bg-surface-hover transition-fast"
              >
                Reject
              </button>
              <button
                onClick={() => void approveTools()}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-accent hover:brightness-110 transition-fast shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
              >
                Approve
              </button>
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
