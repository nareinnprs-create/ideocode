import { lazy, Suspense, useRef } from "react";
import { Terminal, X } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useDragResize } from "../../hooks/useDragResize";

const TerminalPane = lazy(() =>
  import("../terminal/TerminalPane").then((m) => ({ default: m.TerminalPane })),
);

export function BottomPanelDock() {
  const {
    bottomPanelOpen,
    bottomPanel,
    bottomPanelHeight,
    setBottomPanelHeight,
    setBottomPanelOpen,
  } = useAppStore();

  const heightRef = useRef(bottomPanelHeight);
  heightRef.current = bottomPanelHeight;

  const bind = useDragResize(
    (_dx, dy) => setBottomPanelHeight(heightRef.current - dy),
    "row-resize",
  );

  if (!bottomPanelOpen) return null;

  const title = bottomPanel === "terminal" ? "Terminal" : bottomPanel;

  return (
    <div className="flex flex-col shrink-0 border-t border-border-subtle bg-bg-secondary">
      <div
        {...bind}
        role="separator"
        aria-label="Resize bottom panel"
        className="h-[3px] -mt-[1px] cursor-row-resize touch-none"
      />
      <div className="flex items-center justify-between h-9 px-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-text-secondary" />
          <span className="text-xs font-medium text-text-primary uppercase tracking-wider">
            {title}
          </span>
        </div>
        <button
          onClick={() => setBottomPanelOpen(false)}
          className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
          title="Close bottom panel"
        >
          <X size={14} />
        </button>
      </div>
      <div style={{ height: bottomPanelHeight }}>
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center text-xs text-text-muted animate-pulse">
              Loading terminal...
            </div>
          }
        >
          {bottomPanel === "terminal" && <TerminalPane visible={true} />}
        </Suspense>
      </div>
    </div>
  );
}
