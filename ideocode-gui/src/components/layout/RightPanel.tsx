import { Suspense, lazy, useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { useDragResize } from "../../hooks/useDragResize";
import { ErrorBoundary } from "../ErrorBoundary";
import { X } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { FileExplorer } from "../panels/FileExplorer";
import { GitPanel } from "../panels/GitPanel";
import { ProviderPanel } from "../panels/ProviderPanel";
import { SearchPanel } from "../panels/SearchPanel";
import { SessionHistory } from "../panels/SessionHistory";
import { SettingsPanel } from "../panels/SettingsPanel";
import { BrowserPanel } from "../panels/BrowserPanel";

const BuildPanel = lazy(() => import("../panels/BuildPanel").then((m) => ({ default: m.BuildPanel })));
const DebugPanel = lazy(() => import("../panels/DebugPanel").then((m) => ({ default: m.DebugPanel })));
const MemoryPanel = lazy(() => import("../panels/MemoryPanel").then((m) => ({ default: m.MemoryPanel })));
const IssuePanel = lazy(() => import("../panels/IssuePanel").then((m) => ({ default: m.IssuePanel })));

const PANEL_TITLES: Record<string, string> = {
  files: "File Explorer",
  git: "Git",
  search: "Search",
  build: "Build",
  terminal: "Terminal",
  providers: "Providers",
  sessions: "Sessions",
  debug: "Debug",
  settings: "Settings",
  memory: "Memory",
  issues: "Issues",
  browser: "Browser",
};

export function RightPanel() {
  const { rightPanel, setRightPanelOpen, rightPanelWidth, setRightPanelWidth } =
    useAppStore();
  const title = PANEL_TITLES[rightPanel] ?? rightPanel;

  const widthRef = useRef(rightPanelWidth);
  widthRef.current = rightPanelWidth;

  const bind = useDragResize(
    (dx, _dy) => setRightPanelWidth(widthRef.current - dx),
    "col-resize",
  );

  return (
    <aside
      className="flex border-l border-border-subtle bg-bg-secondary flex-col relative animate-slide-in-right"
      style={{ width: rightPanelWidth }}
    >
      {/* Drag handle on the left edge */}
      <div
        {...bind}
        role="separator"
        aria-label="Resize panel"
        className="absolute left-0 top-0 bottom-0 w-[3px] -ml-[1px] cursor-col-resize touch-none z-10 resize-handle-x"
      />
      {/* Header */}
      <div className="flex items-center justify-between h-10 pl-3 pr-2 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {title}
        </span>
        <IconButton size="sm" label="Close panel" onClick={() => setRightPanelOpen(false)}>
          <X />
        </IconButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="p-4 text-center text-text-muted text-xs animate-pulse">Loading...</div>}>
          <PanelContent panel={rightPanel} />
        </Suspense>
      </div>
    </aside>
  );
}

function PanelContent({ panel }: { panel: string }) {
  const wrapped = (node: React.ReactNode) => (
    <ErrorBoundary key={panel} variant="panel">
      {node}
    </ErrorBoundary>
  );

  switch (panel) {
    case "files":
      return wrapped(<FileExplorer />);
    case "git":
      return wrapped(<GitPanel />);
    case "search":
      return wrapped(<SearchPanel />);
    case "providers":
      return wrapped(<ProviderPanel />);
    case "sessions":
      return wrapped(<SessionHistory />);
    case "build":
      return wrapped(<BuildPanel />);
    case "debug":
      return wrapped(<DebugPanel />);
    case "settings":
      return wrapped(<SettingsPanel />);
    case "memory":
      return wrapped(<MemoryPanel />);
    case "issues":
      return wrapped(<IssuePanel />);
    case "browser":
      return wrapped(<BrowserPanel />);
    default:
      return (
        <div className="p-4 text-text-muted text-xs text-center">
          {panel} coming soon
        </div>
      );
  }
}
