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
  { id: "debug", icon: BugPlay, label: "Debug" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const { activePanel, setActivePanel, setRightPanel, setRightPanelOpen } =
    useAppStore();

  const handleClick = (id: PanelId) => {
    if (id === "chat") {
      setActivePanel("chat");
    } else {
      setRightPanel(id);
      setRightPanelOpen(true);
    }
  };

  return (
    <aside className="flex flex-col w-[52px] bg-bg-secondary border-r border-border-subtle">
      {SIDEBAR_ITEMS.map(({ id, icon: Icon, label }) => {
        const isActive = id === "chat" ? activePanel === "chat" : false;
        return (
          <button
            key={id}
            onClick={() => handleClick(id)}
            title={label}
            className={`flex items-center justify-center w-full h-[52px] transition-fast
              ${
                isActive
                  ? "text-accent-primary bg-bg-tertiary"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
              }`}
          >
            <Icon size={20} />
          </button>
        );
      })}
    </aside>
  );
}
