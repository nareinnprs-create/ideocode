import { useEffect, useState } from "react";
import { GitBranch, ShieldCheck, Loader2, Zap, Shield, Brain, Sparkles } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useGitStore } from "../../stores/gitStore";
import { useChatStore, type ExecutionMode, type ThoughtLevel } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { getGatewayStatus, type GatewayStatus } from "../../lib/tauri-commands";
import { Tooltip } from "../ui/Tooltip";

export function StatusBar() {
  const version = useAppStore((s) => s.version);
  const model = useChatStore((s) => s.model);
  const busy = useChatStore((s) => s.loading || s.streaming);
  const messages = useChatStore((s) => s.messages);
  const executionMode = useChatStore((s) => s.executionMode);
  const setExecutionMode = useChatStore((s) => s.setExecutionMode);
  const thoughtLevel = useChatStore((s) => s.thoughtLevel);
  const setThoughtLevel = useChatStore((s) => s.setThoughtLevel);
  const gitStatus = useGitStore((s) => s.status);
  const loadGitStatus = useGitStore((s) => s.loadStatus);
  const rootPath = useFileStore((s) => s.rootPath);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [thinkingDots, setThinkingDots] = useState("");

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getGatewayStatus();
        if (!cancelled) setGateway(status);
      } catch {
        if (!cancelled) setGateway(null);
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!rootPath) return;
    loadGitStatus(rootPath).catch(() => {});
    const timer = setInterval(() => loadGitStatus(rootPath).catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, [rootPath, loadGitStatus]);

  useEffect(() => {
    if (!busy) { setThinkingDots(""); return; }
    const int = setInterval(() => setThinkingDots((d) => d.length > 2 ? "" : d + "."), 500);
    return () => clearInterval(int);
  }, [busy]);

  const engineState =
    gateway?.online
      ? { label: "Engine online", dot: "bg-success", text: "text-success", pulse: false }
      : gateway?.installing
        ? { label: "Engine installing", dot: "bg-warning", text: "text-warning", pulse: true }
        : { label: "Engine starting", dot: "bg-accent-primary", text: "text-accent-primary", pulse: true };

  const gitChanges = gitStatus
    ? gitStatus.staged.length + gitStatus.modified.length + gitStatus.untracked.length + gitStatus.conflicted.length
    : 0;

  const EXEC_MODE_ICONS: Record<ExecutionMode, typeof Zap> = {
    confirm: Shield,
    "auto-edit": Zap,
    plan: Zap,
    "full-access": Zap,
  };

  const EXEC_MODE_LABELS: Record<ExecutionMode, string> = {
    confirm: "Confirm",
    "auto-edit": "Auto Edit",
    plan: "Plan",
    "full-access": "Full Access",
  };

  const THOUGHT_ICONS: Record<ThoughtLevel, typeof Zap> = {
    low: Zap,
    high: Brain,
    max: Sparkles,
  };

  const THOUGHT_LABELS: Record<ThoughtLevel, string> = {
    low: "Low",
    high: "High",
    max: "Max",
  };

  const cycleExecMode = () => {
    const order: ExecutionMode[] = ["confirm", "auto-edit", "plan", "full-access"];
    const idx = order.indexOf(executionMode);
    setExecutionMode(order[(idx + 1) % order.length]);
  };

  const cycleThoughtLevel = () => {
    const order: ThoughtLevel[] = ["low", "high", "max"];
    const idx = order.indexOf(thoughtLevel);
    setThoughtLevel(order[(idx + 1) % order.length]);
  };

  const ExecIcon = EXEC_MODE_ICONS[executionMode];
  const ThoughtIcon = THOUGHT_ICONS[thoughtLevel];

  const totalTokens = messages.reduce((acc, m) => acc + (m.usage?.total_tokens ?? 0), 0);

  return (
    <footer className="flex items-center justify-between h-7 px-3 bg-bg-secondary/80 border-t border-border-default text-[11px] text-text-secondary select-none gap-3 surface-blur hairline-top">
      {/* Left — git + engine */}
      <div className="flex items-center gap-3 min-w-0">
        {gitStatus ? (
          <Tooltip label={`${gitChanges} changed file${gitChanges === 1 ? "" : "s"}`}>
            <button
              onClick={() => useAppStore.getState().setRightPanel("git")}
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-fast"
              title="Open Git panel"
            >
              <GitBranch size={12} className="text-info" />
              <span className="font-medium max-w-40 truncate">{gitStatus.branch}</span>
              {gitChanges > 0 && (
                <span className="px-1.5 rounded-md bg-warning/15 text-warning font-mono text-[10px] font-semibold">
                  {gitChanges}
                </span>
              )}
              {gitStatus.ahead > 0 && <span className="text-accent-primary font-semibold">↑{gitStatus.ahead}</span>}
              {gitStatus.behind > 0 && <span className="text-warning font-semibold">↓{gitStatus.behind}</span>}
            </button>
          </Tooltip>
        ) : (
          <span className="text-text-muted">No git repo</span>
        )}

        <span className="flex items-center gap-1.5">
          {busy ? (
            <Loader2 size={12} className="animate-spin text-accent-primary" />
          ) : (
            <span className={`w-2 h-2 rounded-full ${engineState.dot} ${engineState.pulse ? "animate-pulse-glow" : ""}`} />
          )}
          <span
            className={`font-medium ${engineState.text}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {busy ? `Thinking${thinkingDots}` : engineState.label}
          </span>
        </span>
      </div>

      {/* Center — model + tokens */}
      <div className="flex items-center gap-3 min-w-0">
        {model && (
          <span className="text-text-secondary font-mono truncate max-w-48 px-1.5 py-0.5 rounded bg-bg-elevated border border-border-subtle" title={model}>
            {model}
          </span>
        )}
        <Tooltip label={`Execution: ${EXEC_MODE_LABELS[executionMode]} (Shift+Tab to cycle)`}>
          <button
            onClick={cycleExecMode}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-subtle transition-fast"
          >
            <ExecIcon size={10} />
            <span>{EXEC_MODE_LABELS[executionMode]}</span>
          </button>
        </Tooltip>
        <Tooltip label={`Thought: ${THOUGHT_LABELS[thoughtLevel]} (Ctrl+T to cycle)`}>
          <button
            onClick={cycleThoughtLevel}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-subtle transition-fast"
          >
            <ThoughtIcon size={10} />
            <span>{THOUGHT_LABELS[thoughtLevel]}</span>
          </button>
        </Tooltip>
        {totalTokens > 0 && (
          <span className="flex items-center gap-1 text-accent-primary">
            <Zap size={10} />
            <span className="font-mono font-semibold">{totalTokens.toLocaleString()}</span>
            <span className="text-text-muted">tokens</span>
          </span>
        )}
      </div>

      {/* Right — privacy, version */}
      <div className="flex items-center gap-3 shrink-0">
        <Tooltip label="Runs locally — your code never leaves this machine">
          <span className="flex items-center gap-1.5 text-success font-medium">
            <ShieldCheck size={12} />
            <span>Local</span>
          </span>
        </Tooltip>
        <span className="text-text-muted font-mono">v{version}</span>
      </div>
    </footer>
  );
}
