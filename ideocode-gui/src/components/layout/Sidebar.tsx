import { useAppStore, type PanelId } from "../../stores/appStore";
import {
  MessageSquare,
  FolderTree,
  GitBranch,
  Search,
  Hammer,
  Terminal,
  Cpu,
  History,
  BugPlay,
  Settings,
  Brain,
  AlertCircle,
  Globe,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

interface SidebarItem {
  id: PanelId;
  icon: typeof MessageSquare;
  label: string;
  shortcut?: string;
}

const TOP_ITEMS: SidebarItem[] = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "files", icon: FolderTree, label: "Files" },
  { id: "git", icon: GitBranch, label: "Git" },
  { id: "search", icon: Search, label: "Search" },
  { id: "sessions", icon: History, label: "Sessions" },
  { id: "memory", icon: Brain, label: "Memory" },
  { id: "issues", icon: AlertCircle, label: "Issues" },
  { id: "browser", icon: Globe, label: "Browser" },
  { id: "debug", icon: BugPlay, label: "Debug" },
  { id: "build", icon: Hammer, label: "Build" },
  { id: "providers", icon: Cpu, label: "Providers" },
];

const BOTTOM_ITEMS: SidebarItem[] = [
  { id: "settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const {
    activePanel,
    rightPanel,
    rightPanelOpen,
    bottomPanel,
    bottomPanelOpen,
    setActivePanel,
    setRightPanel,
    setRightPanelOpen,
    setBottomPanel,
    toggleBottomPanel,
  } = useAppStore();

  const handleClick = (id: PanelId) => {
    if (id === "chat") {
      setActivePanel("chat");
      return;
    }
    if (id === "terminal") {
      setBottomPanel("terminal");
      toggleBottomPanel();
      return;
    }
    if (rightPanelOpen && rightPanel === id) {
      setRightPanelOpen(false);
    } else {
      setRightPanel(id);
      setRightPanelOpen(true);
    }
  };

  const isActive = (id: PanelId) => {
    if (id === "chat") return activePanel === "chat";
    if (id === "terminal") return bottomPanelOpen && bottomPanel === "terminal";
    return rightPanelOpen && rightPanel === id;
  };

  return (
    <aside className="flex flex-col w-[52px] bg-bg-secondary border-r border-border-subtle py-2 items-center justify-between shrink-0">
      <nav className="flex flex-col gap-1 items-center" aria-label="Primary">
        {TOP_ITEMS.map(({ id, icon: Icon, label, shortcut }) => (
          <Tooltip key={id} label={`${label}${shortcut ? ` (${shortcut})` : ""}`} position="right">
            <button
              onClick={() => handleClick(id)}
              aria-label={label}
              aria-pressed={isActive(id)}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                isActive(id)
                  ? "text-accent-primary bg-bg-tertiary"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              {isActive(id) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent-primary -ml-[13px]" />
              )}
              <Icon size={19} strokeWidth={isActive(id) ? 2.2 : 1.8} />
            </button>
          </Tooltip>
        ))}
      </nav>

      <nav className="flex flex-col gap-1 items-center" aria-label="Utility">
        <Tooltip label="Terminal" position="right">
          <button
            onClick={() => handleClick("terminal")}
            aria-label="Terminal"
            aria-pressed={bottomPanelOpen && bottomPanel === "terminal"}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
              bottomPanelOpen && bottomPanel === "terminal"
                ? "text-accent-primary bg-bg-tertiary"
                : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            {bottomPanelOpen && bottomPanel === "terminal" && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent-primary -ml-[13px]" />
            )}
            <Terminal size={19} strokeWidth={bottomPanelOpen && bottomPanel === "terminal" ? 2.2 : 1.8} />
          </button>
        </Tooltip>
        {BOTTOM_ITEMS.map(({ id, icon: Icon, label }) => (
          <Tooltip key={id} label={label} position="right">
            <button
              onClick={() => handleClick(id)}
              aria-label={label}
              aria-pressed={isActive(id)}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 ${
                isActive(id)
                  ? "text-accent-primary bg-bg-tertiary"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              {isActive(id) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent-primary -ml-[13px]" />
              )}
              <Icon size={19} strokeWidth={isActive(id) ? 2.2 : 1.8} />
            </button>
          </Tooltip>
        ))}
        <div className="mt-1 pt-2 border-t border-border-subtle w-8 flex justify-center">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-[9px] font-bold text-white shadow-glow">
            ID
          </span>
        </div>
      </nav>
    </aside>
  );
}
