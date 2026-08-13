import { useEffect, useState } from "react";
import { Search, Minus, Square, Copy, X, Sparkles, GitBranch, Scissors } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../../stores/appStore";
import { useFileStore } from "../../stores/fileStore";
import { useChatStore } from "../../stores/chatStore";
import { useGitStore } from "../../stores/gitStore";
import { gitBranches, gitCheckout, type GitBranch as GitBranchInfo } from "../../lib/tauri-commands";
import { isTauri } from "../../lib/tauri-env";
import { Kbd } from "../ui/Kbd";
import { Tooltip } from "../ui/Tooltip";

function getProjectName(): string {
  const root = useFileStore.getState().rootPath;
  if (!root) return "IDEOCODE";
  const parts = root.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? "IDEOCODE";
}

export function TopBar() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const compact = useChatStore((s) => s.compact);
  const loadStatus = useGitStore((s) => s.loadStatus);
  const [projectName, setProjectName] = useState(getProjectName);
  const [isMaximized, setIsMaximized] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const tauri = isTauri();
  const rootPath = useFileStore((s) => s.rootPath);

  useEffect(() => {
    if (!rootPath) return;
    gitBranches(rootPath)
      .then((list) => {
        setBranches(list);
        setCurrentBranch(list.find((b) => b.current)?.name ?? "");
      })
      .catch(() => {});
  }, [rootPath]);

  const checkoutBranch = async (name: string) => {
    if (!rootPath || name === currentBranch) return;
    try {
      await gitCheckout(rootPath, name);
      setCurrentBranch(name);
      setBranches((prev) => prev.map((b) => ({ ...b, current: b.name === name })));
      loadStatus(rootPath);
    } catch {
      /* git errors surface through the git panel */
    }
  };

  useEffect(() => {
    const update = () => setProjectName(getProjectName());
    return useFileStore.subscribe(update);
  }, []);

  useEffect(() => {
    if (!tauri) return;
    let disposed = false;
    (async () => {
      const win = getCurrentWindow();
      if (disposed) return;
      try {
        setIsMaximized(await win.isMaximized());
      } catch {
        /* not available in webview yet */
      }
      const unlisten = await win.onResized(() => {
        win.isMaximized().then(setIsMaximized).catch(() => {});
      });
      if (disposed) unlisten();
    })();
    return () => {
      disposed = true;
    };
  }, [tauri]);

  const winControl = (fn: () => Promise<void> | void) => {
    if (!tauri) return;
    try {
      void fn();
    } catch {
      /* swallow — running outside a Tauri webview */
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="flex items-center h-10 px-3 gap-3 bg-bg-primary border-b border-border-subtle select-none shrink-0"
    >
      {/* Brand / project */}
      <div className="flex items-center gap-2.5 min-w-0" data-tauri-drag-region>
        <span className="w-5 h-5 rounded-md accent-gradient-bg flex items-center justify-center shrink-0 shadow-glow">
          <Sparkles size={12} className="text-white" />
        </span>
        <span className="font-display font-bold text-[13px] text-text-primary tracking-tight shrink-0">
          IDEOCODE
        </span>
        <span className="text-text-muted opacity-60">/</span>
        <span className="text-xs text-text-secondary font-medium truncate max-w-40">{projectName}</span>
      </div>

      {/* Command bar */}
      <div className="flex-1 flex justify-center min-w-0">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 h-7 px-3 rounded-lg border border-border-subtle bg-bg-secondary text-text-muted hover:border-border-default hover:text-text-secondary transition-all duration-150 w-full max-w-md"
        >
          <Search size={13} />
          <span className="text-xs flex-1 text-left truncate">Search or run commands…</span>
          <span className="flex items-center gap-0.5 shrink-0">
            <Kbd>Ctrl</Kbd>
            <span className="text-text-muted text-[10px]">+</span>
            <Kbd>Shift</Kbd>
            <span className="text-text-muted text-[10px]">+</span>
            <Kbd>P</Kbd>
          </span>
        </button>
      </div>

      {/* Session + branch actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Tooltip label="Compact conversation">
          <button
            onClick={() => void compact()}
            title="Compact conversation"
            aria-label="Compact conversation"
            className="btn-icon"
          >
            <Scissors size={13} />
          </button>
        </Tooltip>

        <div className="relative">
          <button
            onClick={() => {
              if (!rootPath) return;
              if (!branchMenuOpen) {
                gitBranches(rootPath).then(setBranches).catch(() => {});
              }
              setBranchMenuOpen((o) => !o);
            }}
            className="flex items-center gap-1.5 h-7 px-2 rounded-lg border border-border-subtle bg-bg-secondary text-text-muted hover:text-text-secondary hover:border-border-default transition-fast text-xs"
            title="Switch branch"
            aria-label="Switch branch"
          >
            <GitBranch size={12} />
            <span className="max-w-24 truncate font-mono">{currentBranch || "branch"}</span>
          </button>

          {branchMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setBranchMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 w-52 rounded-lg border border-border-default bg-bg-primary shadow-pop overflow-hidden animate-scale-in">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-muted border-b border-border-subtle">
                  Branches
                </div>
                {branches.length === 0 && (
                  <div className="px-3 py-2 text-[11px] text-text-muted">No branches found</div>
                )}
                {branches.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      setBranchMenuOpen(false);
                      void checkoutBranch(b.name);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-fast ${
                      b.current
                        ? "bg-accent-primary/10 text-accent-primary"
                        : "text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    <GitBranch
                      size={11}
                      className={b.current ? "text-accent-primary" : "text-text-muted"}
                    />
                    <span className="flex-1 truncate font-mono">{b.name}</span>
                    {b.remote && !b.current && (
                      <span className="text-[9px] text-text-muted">remote</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Window controls */}
      {tauri && (
        <div className="flex items-center -mr-3 h-full shrink-0">
          <button
            onClick={() => winControl(() => getCurrentWindow().minimize())}
            aria-label="Minimize window"
            title="Minimize"
            className="flex items-center justify-center w-11 h-full text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors duration-100"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => winControl(() => getCurrentWindow().toggleMaximize())}
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
            title={isMaximized ? "Restore" : "Maximize"}
            className="flex items-center justify-center w-11 h-full text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors duration-100"
          >
            {isMaximized ? <Copy size={12} /> : <Square size={11} />}
          </button>
          <button
            onClick={() => winControl(() => getCurrentWindow().close())}
            aria-label="Close window"
            title="Close"
            className="flex items-center justify-center w-11 h-full text-text-muted hover:text-white hover:bg-error transition-colors duration-100"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </header>
  );
}
