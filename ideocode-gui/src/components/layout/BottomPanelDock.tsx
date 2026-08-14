import { lazy, Suspense, useRef } from "react";
import { Terminal, Hammer, BugPlay, Brain, AlertCircle, X } from "lucide-react";
import { useAppStore, type PanelId } from "../../stores/appStore";
import { useDragResize } from "../../hooks/useDragResize";

const TerminalPane = lazy(() =>
  import("../terminal/TerminalPane").then((m) => ({ default: m.TerminalPane })),
);
const BuildPanel = lazy(() =>
  import("../panels/BuildPanel").then((m) => ({ default: m.BuildPanel })),
);
const DebugPanel = lazy(() =>
  import("../panels/DebugPanel").then((m) => ({ default: m.DebugPanel })),
);
const MemoryPanel = lazy(() =>
  import("../panels/MemoryPanel").then((m) => ({ default: m.MemoryPanel })),
);
const IssuePanel = lazy(() =>
  import("../panels/IssuePanel").then((m) => ({ default: m.IssuePanel })),
);

const BOTTOM_TABS: { id: PanelId; label: string; icon: typeof Terminal }[] = [
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "build", label: "Build", icon: Hammer },
  { id: "debug", label: "Debug", icon: BugPlay },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "issues", label: "Issues", icon: AlertCircle },
];

function PanelLoader({ panel }: { panel: PanelId }) {
  switch (panel) {
    case "terminal":
      return <TerminalPane visible={true} />;
    case "build":
      return <BuildPanel />;
    case "debug":
      return <DebugPanel />;
    case "memory":
      return <MemoryPanel />;
    case "issues":
      return <IssuePanel />;
    default:
      return null;
  }
}

export function BottomPanelDock() {
  const {
    bottomPanelOpen,
    bottomPanel,
    bottomPanelHeight,
    setBottomPanel,
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

  return (
    <div className="flex flex-col shrink-0 border-t border-border-subtle bg-bg-secondary">
      <div
        {...bind}
        role="separator"
        aria-label="Resize bottom panel"
        className="h-[3px] -mt-[1px] cursor-row-resize touch-none resize-handle-y"
      />
      <div className="flex items-center justify-between h-9 pl-2 pr-3 border-b border-border-subtle gap-2">
        <div className="flex items-center gap-1 min-w-0" role="tablist" aria-label="Bottom panels">
          {BOTTOM_TABS.map(({ id, label, icon: Icon }) => {
            const active = bottomPanel === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onClick={() => setBottomPanel(id)}
                className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-all duration-150 ${
                  active
                    ? "bg-bg-hover text-text-primary"
                    : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <Icon size={13} className={active ? "text-text-primary" : ""} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setBottomPanelOpen(false)}
          className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
          title="Close bottom panel"
          aria-label="Close bottom panel"
        >
          <X size={14} />
        </button>
      </div>
      <div style={{ height: bottomPanelHeight }} className="min-h-0 overflow-hidden">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center text-xs text-text-muted animate-pulse">
              Loading…
            </div>
          }
        >
          <PanelLoader panel={bottomPanel} />
        </Suspense>
      </div>
    </div>
  );
}
