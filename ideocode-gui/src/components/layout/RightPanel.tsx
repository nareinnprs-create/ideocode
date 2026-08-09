import { Suspense, useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { useDragResize } from "../../hooks/useDragResize";
import { ErrorBoundary } from "../ErrorBoundary";
import { X } from "lucide-react";
import { FileExplorer } from "../panels/FileExplorer";
import { GitPanel } from "../panels/GitPanel";
import { ProviderPanel } from "../panels/ProviderPanel";
import { SearchPanel } from "../panels/SearchPanel";
import { SessionHistory } from "../panels/SessionHistory";
import { BuildPanel } from "../panels/BuildPanel";
import { DebugPanel } from "../panels/DebugPanel";
import { SettingsPanel } from "../panels/SettingsPanel";
import { MemoryPanel } from "../panels/MemoryPanel";
import { IssuePanel } from "../panels/IssuePanel";
import { BrowserPanel } from "../panels/BrowserPanel";

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
      className="flex border-l border-border-subtle bg-bg-secondary flex-col relative"
      style={{ width: rightPanelWidth }}
    >
      {/* Drag handle on the left edge */}
      <div
        {...bind}
        role="separator"
        aria-label="Resize panel"
        className="absolute left-0 top-0 bottom-0 w-[3px] -ml-[1px] cursor-col-resize touch-none z-10"
      />
      {/* Header */}
      <div className="flex items-center justify-between h-10 pl-2 pr-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {title}
        </span>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
        >
          <X size={14} />
        </button>
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
