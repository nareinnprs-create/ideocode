import { Suspense, lazy, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "../../stores/appStore";
import { useDragResize } from "../../hooks/useDragResize";
import { ErrorBoundary } from "../ErrorBoundary";
import { X } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { pageTransition, transitions } from "../../lib/motion";
import { FileExplorer } from "../panels/FileExplorer";
import { GitPanel } from "../panels/GitPanel";
import { ProviderPanel } from "../panels/ProviderPanel";
import { SearchPanel } from "../panels/SearchPanel";
import { SessionHistory } from "../panels/SessionHistory";
import { SettingsPanel } from "../panels/SettingsPanel";
import { BrowserPanel } from "../panels/BrowserPanel";
import { ComposerPanel } from "../panels/ComposerPanel";
import { WikiPanel } from "../panels/WikiPanel";
import { AutomationsPanel } from "../panels/AutomationsPanel";
import { SubagentsPanel } from "../panels/SubagentsPanel";
import { CommandsPanel } from "../panels/CommandsPanel";
import { McpPanel } from "../panels/McpPanel";
import { HooksPanel } from "../panels/HooksPanel";
import { UsageStatsPanel } from "../panels/UsageStatsPanel";
import { PluginsPanel } from "../panels/PluginsPanel";
import { SkillsPanel } from "../panels/SkillsPanel";
import { BotChannelPanel } from "../panels/BotChannelPanel";
import { RemoteControlPanel } from "../panels/RemoteControlPanel";
import { KeyboardShortcutsPanel } from "../panels/KeyboardShortcutsPanel";
import { SafetyPanel } from "../panels/SafetyPanel";
import { IdleTasksPanel } from "../panels/IdleTasksPanel";
import { EditReviewPanel } from "../panels/EditReviewPanel";
import { TaskManagementPanel } from "../panels/TaskManagementPanel";
import { GitGraphPanel } from "../panels/GitGraphPanel";
import { RemoteDevPanel } from "../panels/RemoteDevPanel";
import { CodeSnippetsPanel } from "../panels/CodeSnippetsPanel";
import { ProjectTemplatesPanel } from "../panels/ProjectTemplatesPanel";
import { GoalSummaryPanel } from "../goal/GoalSummaryPanel";
import { ThemeMarketplacePanel } from "../panels/ThemeMarketplacePanel";
import { ContextPanel } from "../panels/ContextPanel";

const BuildPanel = lazy(() => import("../panels/BuildPanel").then((m) => ({ default: m.BuildPanel })));
const DebugPanel = lazy(() => import("../panels/DebugPanel").then((m) => ({ default: m.DebugPanel })));
const MemoryPanel = lazy(() => import("../panels/MemoryPanel").then((m) => ({ default: m.MemoryPanel })));
const IssuePanel = lazy(() => import("../panels/IssuePanel").then((m) => ({ default: m.IssuePanel })));
const TimelinePanel = lazy(() => import("../panels/TimelinePanel").then((m) => ({ default: m.TimelinePanel })));
const OutputPanel = lazy(() => import("../panels/OutputPanel").then((m) => ({ default: m.OutputPanel })));
const DiffPanel = lazy(() => import("../panels/DiffPanel").then((m) => ({ default: m.DiffPanel })));

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
  composer: "Composer",
  goal: "Goal Mode",
  wiki: "Wiki",
  automations: "Automations",
  subagents: "Subagents",
  commands: "Commands",
  timeline: "Timeline",
  mcp: "MCP Services",
  hooks: "Hooks",
  "usage-stats": "Usage Stats",
  plugins: "Plugins",
  skills: "Skills",
  "bot-channel": "Bot Channel",
  "remote-dev": "Remote Dev",
  "remote-control": "Remote Control",
  shortcuts: "Keyboard Shortcuts",
  safety: "Safety",
  "idle-tasks": "Idle Tasks",
  "edit-review": "Edit Review",
  output: "Output",
  diff: "Diff",
  "task-management": "Task Management",
  "git-graph": "Git Graph",
  snippets: "Code Snippets",
  templates: "Project Templates",
  themes: "Theme Marketplace",
  context: "Context",
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
      className="flex flex-col relative animate-slide-in-right z-10 surface-blur hairline-left"
      style={{
        width: rightPanelWidth,
        background: "color-mix(in srgb, var(--color-surface) 70%, transparent)",
      }}
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
        <span className="text-[13px] font-medium text-fg-primary">
          {title}
        </span>
        <IconButton size="sm" label="Close panel" onClick={() => setRightPanelOpen(false)}>
          <X />
        </IconButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden panel-enter">
        <AnimatePresence mode="wait">
          <motion.div
            key={rightPanel}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transitions.gentle}
            className="h-full"
          >
            <Suspense fallback={<div className="p-4 text-center text-fg-muted text-xs animate-pulse">Loading...</div>}>
              <PanelContent panel={rightPanel} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
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
    case "terminal":
      // Terminal lives in the bottom dock; redirect there instead of showing
      // a dead "coming soon" panel.
      useAppStore.getState().setBottomPanel("terminal");
      useAppStore.getState().setBottomPanelOpen(true);
      useAppStore.getState().setRightPanelOpen(false);
      return null;
    case "search":
      return wrapped(<SearchPanel />);
    case "providers":
      return wrapped(<ProviderPanel />);
    case "sessions":
      return wrapped(<SessionHistory />);
    case "composer":
      return wrapped(<ComposerPanel />);
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
    case "goal":
      return wrapped(<GoalSummaryPanel />);
    case "wiki":
      return wrapped(<WikiPanel />);
    case "automations":
      return wrapped(<AutomationsPanel />);
    case "subagents":
      return wrapped(<SubagentsPanel />);
    case "commands":
      return wrapped(<CommandsPanel />);
    case "timeline":
      return wrapped(<TimelinePanel />);
    case "mcp":
      return wrapped(<McpPanel />);
    case "hooks":
      return wrapped(<HooksPanel />);
    case "usage-stats":
      return wrapped(<UsageStatsPanel />);
    case "plugins":
      return wrapped(<PluginsPanel />);
    case "skills":
      return wrapped(<SkillsPanel />);
    case "bot-channel":
      return wrapped(<BotChannelPanel />);
    case "remote-dev":
      return wrapped(<RemoteDevPanel />);
    case "remote-control":
      return wrapped(<RemoteControlPanel />);
    case "shortcuts":
      return wrapped(<KeyboardShortcutsPanel />);
    case "safety":
      return wrapped(<SafetyPanel />);
    case "idle-tasks":
      return wrapped(<IdleTasksPanel />);
    case "edit-review":
      return wrapped(<EditReviewPanel />);
    case "output":
      return wrapped(<OutputPanel />);
    case "diff":
      return wrapped(<DiffPanel />);
    case "task-management":
      return wrapped(<TaskManagementPanel />);
    case "git-graph":
      return wrapped(<GitGraphPanel />);
    case "snippets":
      return wrapped(<CodeSnippetsPanel />);
    case "templates":
      return wrapped(<ProjectTemplatesPanel />);
    case "themes":
      return wrapped(<ThemeMarketplacePanel />);
    case "context":
      return wrapped(<ContextPanel />);
    default:
      return (
        <div className="p-4 text-fg-muted text-xs text-center">
          {panel} coming soon
        </div>
      );
  }
}
