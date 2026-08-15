import {
  FolderTree,
  GitBranch,
  Terminal,
  Hammer,
  BugPlay,
  History,
  Cpu,
  Settings,
  Palette,
  MessageSquare,
  RefreshCw,
  ClipboardCopy,
  Columns2,
  Brain,
  AlertCircle,
  Globe,
  Search,
  Save,
} from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useChatStore } from "../stores/chatStore";
import { useFileStore } from "../stores/fileStore";
import { notify } from "../stores/toastStore";

export type CommandIcon = typeof Search;

export interface CommandAction {
  id: string;
  label: string;
  category: string;
  icon: CommandIcon;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
}

const store = () => useAppStore.getState();

function openPanel(panel: string) {
  const s = store();
  if (s.rightPanelOpen && s.rightPanel === panel) {
    s.setRightPanelOpen(false);
  } else {
    s.setRightPanel(panel as never);
    s.setRightPanelOpen(true);
  }
}

const PANELS: { id: string; label: string; icon: CommandIcon }[] = [
  { id: "files", label: "Files", icon: FolderTree },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "search", label: "Search", icon: Search },
  { id: "sessions", label: "Sessions", icon: History },
  { id: "providers", label: "Providers", icon: Cpu },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "issues", label: "Issues", icon: AlertCircle },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "debug", label: "Debug", icon: BugPlay },
  { id: "build", label: "Build", icon: Hammer },
  { id: "settings", label: "Settings", icon: Settings },
];

export const COMMANDS: CommandAction[] = [
  ...PANELS.map((p) => ({
    id: `open-${p.id}`,
    label: `Open ${p.label}`,
    category: "Panels",
    icon: p.icon,
    run: () => openPanel(p.id),
  })),
  {
    id: "open-terminal",
    label: "Open Terminal",
    category: "Panels",
    icon: Terminal,
    shortcut: "Ctrl+`",
    keywords: ["terminal", "console", "shell", "bottom"],
    run: () => {
      const s = store();
      s.setBottomPanel("terminal");
      s.setBottomPanelOpen(true);
    },
  },
  {
    id: "toggle-sidebar",
    label: "Toggle Sidebar",
    category: "View",
    icon: FolderTree,
    shortcut: "Ctrl+B",
    keywords: ["sidebar", "rail", "nav"],
    run: () => store().toggleSidebar(),
  },
  {
    id: "toggle-right",
    label: "Toggle Right Panel",
    category: "View",
    icon: Columns2,
    shortcut: "Ctrl+\\",
    keywords: ["right", "panel", "toggle"],
    run: () => store().toggleRightPanel(),
  },
  {
    id: "toggle-bottom",
    label: "Toggle Bottom Panel",
    category: "View",
    icon: Terminal,
    shortcut: "Ctrl+J",
    keywords: ["bottom", "terminal", "toggle"],
    run: () => store().toggleBottomPanel(),
  },
  {
    id: "toggle-editor-split",
    label: "Toggle Editor Split",
    category: "View",
    icon: Columns2,
    keywords: ["split", "editor", "columns"],
    run: () => store().toggleEditorSplit(),
  },
  {
    id: "new-chat",
    label: "New Chat",
    category: "Chat",
    icon: MessageSquare,
    shortcut: "Ctrl+N",
    keywords: ["new", "chat", "clear", "conversation"],
    run: () => void useChatStore.getState().clearMessages(),
  },
  {
    id: "regenerate",
    label: "Regenerate Last Response",
    category: "Chat",
    icon: RefreshCw,
    keywords: ["regenerate", "retry", "again", "response"],
    run: () => void useChatStore.getState().regenerate(),
  },
  {
    id: "copy-conversation",
    label: "Copy Conversation",
    category: "Chat",
    icon: ClipboardCopy,
    keywords: ["copy", "export", "conversation", "messages"],
    run: () => {
      const text = useChatStore
        .getState()
        .messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
        .join("\n\n");
      navigator.clipboard
        .writeText(text)
        .then(() => notify("success", "Conversation copied", ""))
        .catch(() => notify("error", "Copy failed", ""));
    },
  },
  {
    id: "save-file",
    label: "Save Current File",
    category: "Editor",
    icon: Save,
    shortcut: "Ctrl+S",
    keywords: ["save", "file", "write"],
    run: () => void useFileStore.getState().saveFile(),
  },
  {
    id: "change-theme",
    label: "Appearance Settings",
    category: "Settings",
    icon: Palette,
    keywords: ["theme", "color", "dark", "light", "accent", "appearance"],
    run: () => openPanel("settings"),
  },
];

export function getCommandsByCategory(): { category: string; commands: CommandAction[] }[] {
  const groups = new Map<string, CommandAction[]>();
  for (const cmd of COMMANDS) {
    const list = groups.get(cmd.category) ?? [];
    list.push(cmd);
    groups.set(cmd.category, list);
  }
  return Array.from(groups.entries()).map(([category, commands]) => ({ category, commands }));
}
