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

const SIDEBAR_ITEMS: { id: PanelId; icon: typeof MessageSquare; label: string }[] = [
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "files", icon: FolderTree, label: "Files" },
  { id: "git", icon: GitBranch, label: "Git" },
  { id: "search", icon: Search, label: "Search" },
  { id: "build", icon: Hammer, label: "Build" },
  { id: "terminal", icon: Terminal, label: "Terminal" },
  { id: "sessions", icon: History, label: "Sessions" },
  { id: "providers", icon: Cpu, label: "Providers" },
  { id: "memory", icon: Brain, label: "Memory" },
  { id: "issues", icon: AlertCircle, label: "Issues" },
  { id: "browser", icon: Globe, label: "Browser" },
  { id: "debug", icon: BugPlay, label: "Debug" },
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
    if (id === "terminal")
      return bottomPanelOpen && bottomPanel === "terminal";
    return rightPanelOpen && rightPanel === id;
  };

  return (
    <aside className="flex flex-col w-[52px] bg-bg-secondary border-r border-border-subtle">
      {SIDEBAR_ITEMS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => handleClick(id)}
          title={label}
          className={`flex items-center justify-center w-full h-[52px] transition-fast
            ${
              isActive(id)
                ? "text-accent-primary bg-bg-tertiary border-l-2 border-accent-primary"
                : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary border-l-2 border-transparent"
            }`}
        >
          <Icon size={20} />
        </button>
      ))}
    </aside>
  );
}
