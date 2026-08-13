import { useEffect, useState } from "react";
import { GitBranch, ShieldCheck, Loader2 } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useGitStore } from "../../stores/gitStore";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { getGatewayStatus, type GatewayStatus } from "../../lib/tauri-commands";
import { Tooltip } from "../ui/Tooltip";

export function StatusBar() {
  const version = useAppStore((s) => s.version);
  const model = useChatStore((s) => s.model);
  const busy = useChatStore((s) => s.loading || s.streaming);
  const gitStatus = useGitStore((s) => s.status);
  const loadGitStatus = useGitStore((s) => s.loadStatus);
  const rootPath = useFileStore((s) => s.rootPath);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);

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

  const engineState =
    gateway?.online
      ? { label: "Engine online", dot: "bg-success", text: "text-success", pulse: false }
      : gateway?.installing
        ? { label: "Engine installing", dot: "bg-warning", text: "text-warning", pulse: true }
        : { label: "Engine starting", dot: "bg-accent-primary", text: "text-accent-primary", pulse: true };

  const gitChanges =
    gitStatus
      ? gitStatus.staged.length +
        gitStatus.modified.length +
        gitStatus.untracked.length +
        gitStatus.conflicted.length
      : 0;

  return (
    <footer className="flex items-center justify-between h-7 px-3 bg-bg-secondary border-t border-border-subtle text-[11px] text-text-muted select-none gap-3">
      {/* Left — git + engine */}
      <div className="flex items-center gap-3 min-w-0">
        {gitStatus ? (
          <Tooltip label={`${gitChanges} changed file${gitChanges === 1 ? "" : "s"}`}>
            <button
              onClick={() => useAppStore.getState().setRightPanel("git")}
              className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-fast"
              title="Open Git panel"
            >
              <GitBranch size={12} className="text-text-secondary" />
              <span className="font-medium max-w-40 truncate">{gitStatus.branch}</span>
              {gitChanges > 0 && (
                <span className="px-1 rounded bg-bg-elevated text-text-secondary font-mono text-[11px]">
                  {gitChanges}
                </span>
              )}
              {gitStatus.ahead > 0 && <span className="text-text-muted">↑{gitStatus.ahead}</span>}
              {gitStatus.behind > 0 && <span className="text-text-muted">↓{gitStatus.behind}</span>}
            </button>
          </Tooltip>
        ) : (
          <span className="opacity-60">No git repo</span>
        )}

        <span className="flex items-center gap-1.5">
          {busy ? (
            <Loader2 size={12} className="animate-spin text-accent-primary" />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${engineState.dot} ${engineState.pulse ? "animate-pulse" : ""}`} />
          )}
          <span className={engineState.text}>{busy ? "Working" : engineState.label}</span>
        </span>
      </div>

      {/* Center — model */}
      <div className="flex items-center gap-3 min-w-0">
        {model && (
          <span className="text-text-secondary truncate max-w-48" title={model}>
            {model}
          </span>
        )}
      </div>

      {/* Right — privacy, version */}
      <div className="flex items-center gap-3 shrink-0">
        <Tooltip label="Runs locally — your code never leaves this machine">
          <span className="flex items-center gap-1 text-success">
            <ShieldCheck size={12} />
            <span>Local</span>
          </span>
        </Tooltip>
        <span className="opacity-50">v{version}</span>
      </div>
    </footer>
  );
}
