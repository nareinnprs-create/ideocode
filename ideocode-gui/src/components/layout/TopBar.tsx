import { useEffect, useState } from "react";
import { Search, Minus, Square, Copy, X, Sparkles, Scissors } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../../stores/appStore";
import { useFileStore } from "../../stores/fileStore";
import { useChatStore } from "../../stores/chatStore";
import { isTauri } from "../../lib/tauri-env";
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
  const [projectName, setProjectName] = useState(getProjectName);
  const [isMaximized, setIsMaximized] = useState(false);
  const tauri = isTauri();

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
        <span className="w-5 h-5 rounded-md accent-gradient-bg flex items-center justify-center shrink-0">
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
          className="flex items-center gap-2 h-7 px-3 rounded-lg bg-bg-secondary text-text-muted hover:text-text-secondary transition-all duration-150 w-full max-w-md"
        >
          <Search size={13} />
          <span className="text-xs flex-1 text-left truncate">Search commands…</span>
        </button>
      </div>

      {/* Session actions */}
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
