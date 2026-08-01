import { lazy, Suspense } from "react";
import { useAppStore } from "../../stores/appStore";
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

const TerminalPane = lazy(() => import("../terminal/TerminalPane").then(m => ({ default: m.TerminalPane })));

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
  const { rightPanel, setRightPanelOpen } = useAppStore();
  const title = PANEL_TITLES[rightPanel] ?? rightPanel;

  return (
    <aside className="w-[320px] min-w-[280px] max-w-[450px] border-l border-border-subtle bg-bg-secondary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-subtle">
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
  switch (panel) {
    case "files":
      return <FileExplorer />;
    case "git":
      return <GitPanel />;
    case "search":
      return <SearchPanel />;
    case "providers":
      return <ProviderPanel />;
    case "terminal":
      return <TerminalPane visible={true} />;
    case "sessions":
      return <SessionHistory />;
    case "build":
      return <BuildPanel />;
    case "debug":
      return <DebugPanel />;
    case "settings":
      return <SettingsPanel />;
    case "memory":
      return <MemoryPanel />;
    case "issues":
      return <IssuePanel />;
    case "browser":
      return <BrowserPanel />;
    default:
      return (
        <div className="p-4 text-text-muted text-xs text-center">
          {panel} coming soon
        </div>
      );
  }
}
