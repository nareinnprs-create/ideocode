import { useEffect, useState } from "react";
import { Search, Minus, Square, Copy, X, Sparkles } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../../stores/appStore";
import { useFileStore } from "../../stores/fileStore";
import { isTauri } from "../../lib/tauri-env";
import { Kbd } from "../ui/Kbd";

function getProjectName(): string {
  const root = useFileStore.getState().rootPath;
  if (!root) return "IDEOCODE";
  const parts = root.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? "IDEOCODE";
}

export function TopBar() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
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
