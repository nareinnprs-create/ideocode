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
  LayoutTemplate,
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
  { id: "composer", icon: LayoutTemplate, label: "Composer" },
  { id: "debug", icon: BugPlay, label: "Debug" },
  { id: "build", icon: Hammer, label: "Build" },
  { id: "providers", icon: Cpu, label: "Providers" },
];

const BOTTOM_ITEMS: SidebarItem[] = [
  { id: "settings", icon: Settings, label: "Settings" },
];

function SidebarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MessageSquare;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ease-spring ${
        active
          ? "text-accent-primary bg-accent-primary/12 glow-soft"
          : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent-primary shadow-[0_0_8px_var(--idc-glow)]" />
      )}
      <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
    </button>
  );
}

export function Sidebar() {
  const {
    activePanel,
    rightPanel,
    rightPanelOpen,
    bottomPanel,
    bottomPanelOpen,
    chatPanelOpen,
    setActivePanel,
    setChatPanelOpen,
    setRightPanel,
    setRightPanelOpen,
    setBottomPanel,
    toggleBottomPanel,
  } = useAppStore();

  const handleClick = (id: PanelId) => {
    if (id === "chat") {
      setActivePanel("chat");
      setChatPanelOpen(!chatPanelOpen);
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
    if (id === "chat") return activePanel === "chat" && chatPanelOpen;
    if (id === "terminal") return bottomPanelOpen && bottomPanel === "terminal";
    return rightPanelOpen && rightPanel === id;
  };

  return (
    <aside className="flex flex-col w-[52px] bg-bg-secondary/80 border-r border-border-subtle py-2 items-center justify-between shrink-0 surface-blur">
      <nav className="flex flex-col gap-1 items-center" aria-label="Primary">
        {TOP_ITEMS.map(({ id, icon, label, shortcut }) => (
          <Tooltip key={id} label={`${label}${shortcut ? ` (${shortcut})` : ""}`} position="right">
            <SidebarButton
              icon={icon}
              label={label}
              active={isActive(id)}
              onClick={() => handleClick(id)}
            />
          </Tooltip>
        ))}
      </nav>

      <nav className="flex flex-col gap-1 items-center" aria-label="Utility">
        <Tooltip label="Terminal" position="right">
          <SidebarButton
            icon={Terminal}
            label="Terminal"
            active={bottomPanelOpen && bottomPanel === "terminal"}
            onClick={() => handleClick("terminal")}
          />
        </Tooltip>
        {BOTTOM_ITEMS.map(({ id, icon, label }) => (
          <Tooltip key={id} label={label} position="right">
            <SidebarButton
              icon={icon}
              label={label}
              active={isActive(id)}
              onClick={() => handleClick(id)}
            />
          </Tooltip>
        ))}
      </nav>
    </aside>
  );
}
