import { useAppStore, type PanelId } from "../../stores/appStore";
import {
  MessageSquare,
  FolderTree,
  GitBranch,
  Search,
  Terminal,
  History,
  BugPlay,
  Settings,
  Cpu,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

interface SidebarItem {
  id: PanelId;
  icon: typeof MessageSquare;
  label: string;
  shortcut?: string;
}

const TOP_ITEMS: SidebarItem[] = [
  { id: "files", icon: FolderTree, label: "Files" },
  { id: "search", icon: Search, label: "Search" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "debug", icon: BugPlay, label: "Run and Debug" },
  { id: "providers", icon: Cpu, label: "Extensions" },
  { id: "sessions", icon: History, label: "Sessions" },
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
      className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ease-spring ${
        active
          ? "text-text-primary bg-white/5"
          : "text-text-muted hover:text-text-primary hover:bg-white/5"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 rounded-r-full bg-accent-primary" />
      )}
      <Icon size={16} strokeWidth={active ? 2 : 1.75} />
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
    <div className="w-[50px] shrink-0 flex flex-col items-center py-2 bg-transparent border-r border-border-subtle z-20">
      <div className="flex-1 flex flex-col items-center gap-2">
        <SidebarButton
          icon={MessageSquare}
          label="Chat (Cmd+L)"
          active={chatPanelOpen}
          onClick={() => handleClick("chat")}
        />
        {TOP_ITEMS.map((item) => (
          <Tooltip key={item.id} label={item.label} position="right">
            <SidebarButton
              icon={item.icon}
              label={item.label}
              active={isActive(item.id)}
              onClick={() => handleClick(item.id)}
            />
          </Tooltip>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 pb-2">
        <Tooltip label="Terminal (Cmd+`)" position="right">
          <SidebarButton
            icon={Terminal}
            label="Terminal"
            active={bottomPanelOpen && bottomPanel === "terminal"}
            onClick={() => handleClick("terminal")}
          />
        </Tooltip>
        {BOTTOM_ITEMS.map((item) => (
          <Tooltip key={item.id} label={item.label} position="right">
            <SidebarButton
              icon={item.icon}
              label={item.label}
              active={isActive(item.id)}
              onClick={() => handleClick(item.id)}
            />
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
