import { lazy, Suspense, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Terminal, Hammer, BugPlay, Brain, AlertCircle, X, FileOutput, GitCompare, Clock } from "lucide-react";
import { useAppStore, type PanelId } from "../../stores/appStore";
import { useDragResize } from "../../hooks/useDragResize";
import { pageTransition, transitions } from "../../lib/motion";

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
const OutputPanel = lazy(() =>
  import("../panels/OutputPanel").then((m) => ({ default: m.OutputPanel })),
);
const DiffPanel = lazy(() =>
  import("../panels/DiffPanel").then((m) => ({ default: m.DiffPanel })),
);
const TimelinePanel = lazy(() =>
  import("../panels/TimelinePanel").then((m) => ({ default: m.TimelinePanel })),
);

const BOTTOM_TABS: { id: PanelId; label: string; icon: typeof Terminal }[] = [
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "output", label: "Output", icon: FileOutput },
  { id: "build", label: "Build", icon: Hammer },
  { id: "debug", label: "Debug", icon: BugPlay },
  { id: "diff", label: "Diff", icon: GitCompare },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "issues", label: "Issues", icon: AlertCircle },
  { id: "timeline", label: "Timeline", icon: Clock },
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
    case "output":
      return <OutputPanel />;
    case "diff":
      return <DiffPanel />;
    case "timeline":
      return <TimelinePanel />;
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
    <div className="flex flex-col shrink-0 border-t border-border-subtle bg-surface">
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
                    ? "bg-accent-subtle text-accent"
                    : "text-fg-muted hover:text-fg-secondary hover:bg-surface-hover"
                }`}
              >
                <Icon size={13} className={active ? "text-accent" : ""} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setBottomPanelOpen(false)}
          className="p-1 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated"
          title="Close bottom panel"
          aria-label="Close bottom panel"
        >
          <X size={14} />
        </button>
      </div>
      <div style={{ height: bottomPanelHeight }} className="min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={bottomPanel}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.gentle}
            className="h-full"
          >
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-xs text-fg-muted animate-pulse">
                  Loading…
                </div>
              }
            >
              <PanelLoader panel={bottomPanel} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
