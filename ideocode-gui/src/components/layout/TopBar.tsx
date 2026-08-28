import { useEffect, useState } from "react";
import { Search, Minus, Square, Copy, X, Scissors, Sparkles } from "lucide-react";
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
        win.isMaximized().then(setIsMaximized).catch((err) => {
          console.error("Failed to check maximized state:", err);
        });
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
      className="flex items-center h-9 px-2 gap-3 surface-blur hairline-bottom select-none shrink-0 z-20"
      style={{ background: "color-mix(in srgb, var(--color-surface) 60%, transparent)" }}
    >
      {/* Brand / project */}
      <div className="flex items-center gap-2 min-w-0" data-tauri-drag-region>
        <span
          className="w-[18px] h-[18px] rounded-[6px] accent-gradient-bg flex items-center justify-center text-white shrink-0 glow-soft"
          data-tauri-drag-region
        >
          <Sparkles size={10} />
        </span>
        <span className="text-[12px] font-medium text-fg-primary tracking-tight shrink-0">
          IDEOCODE
        </span>
        <span className="text-fg-muted opacity-50">/</span>
        <span className="text-xs text-fg-secondary font-medium truncate max-w-40">{projectName}</span>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-5 bg-border-subtle mx-1" />

      {/* Command bar */}
      <div className="flex-1 flex justify-center min-w-0">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="group flex items-center gap-2 h-6 px-3 rounded-md border border-border-subtle bg-surface-elevated text-fg-muted hover:border-accent hover:text-fg-primary hover:bg-surface-hover transition-all w-full max-w-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Search size={12} className="transition-colors group-hover:text-accent" />
          <span className="text-xs flex-1 text-left truncate">Search commands, files, actions…</span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface text-[10px] font-mono text-fg-muted border border-border-subtle">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-5 bg-border-subtle mx-1" />

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

      {/* Divider */}
      <div className="hidden sm:block w-px h-5 bg-border-subtle mx-1" />

      {/* Window controls */}
      {tauri && (
        <div className="flex items-center -mr-1 h-full shrink-0">
          <button
            onClick={() => winControl(() => getCurrentWindow().minimize())}
            aria-label="Minimize window"
            title="Minimize"
            className="flex items-center justify-center w-11 h-full text-fg-muted hover:text-fg-primary hover:bg-surface-hover active:bg-surface-elevated transition-colors duration-75 rounded-l-md"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => winControl(() => getCurrentWindow().toggleMaximize())}
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
            title={isMaximized ? "Restore" : "Maximize"}
            className="flex items-center justify-center w-11 h-full text-fg-muted hover:text-fg-primary hover:bg-surface-hover active:bg-surface-elevated transition-colors duration-75"
          >
            {isMaximized ? <Copy size={12} /> : <Square size={11} />}
          </button>
          <button
            onClick={() => winControl(() => getCurrentWindow().close())}
            aria-label="Close window"
            title="Close"
            className="flex items-center justify-center w-11 h-full text-fg-muted hover:text-white hover:bg-error active:bg-error/80 transition-colors duration-75 rounded-r-md"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </header>
  );
}
