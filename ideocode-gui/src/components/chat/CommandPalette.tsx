import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { useChatStore } from "../../stores/chatStore";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";
import { THEMES, type Theme } from "../../lib/theme-registry";
import {
  Search,
  Settings,
  FolderTree,
  GitBranch,
  Terminal,
  Cpu,
  Palette,
  Hammer,
  History,
  BugPlay,
  MessageSquare,
  RefreshCw,
  ClipboardCopy,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: typeof Search;
  category: string;
}

const COMMANDS: Command[] = [
  { id: "toggle-sidebar", label: "Toggle Sidebar", shortcut: "⌘B", icon: FolderTree, category: "View" },
  { id: "toggle-right", label: "Toggle Right Panel", shortcut: "⌘\\", icon: FolderTree, category: "View" },
  { id: "open-git", label: "Open Git Panel", shortcut: "⌘W", icon: GitBranch, category: "Panels" },
  { id: "open-terminal", label: "Open Terminal", shortcut: "⌘`", icon: Terminal, category: "Panels" },
  { id: "open-build", label: "Open Build Panel", shortcut: "⌘⇧B", icon: Hammer, category: "Panels" },
  { id: "open-debug", label: "Open Debug Panel", shortcut: "⌘⇧D", icon: BugPlay, category: "Panels" },
  { id: "open-sessions", label: "Open Sessions", icon: History, category: "Panels" },
  { id: "open-providers", label: "Open Providers", icon: Cpu, category: "Panels" },
  { id: "open-settings", label: "Open Settings", shortcut: "⌘,", icon: Settings, category: "Settings" },
  { id: "change-theme", label: "Change Theme", icon: Palette, category: "Settings" },
  { id: "new-chat", label: "New Chat", shortcut: "⌘N", icon: MessageSquare, category: "Chat" },
  { id: "regenerate", label: "Regenerate Last Response", icon: RefreshCw, category: "Chat" },
  { id: "copy-conversation", label: "Copy Conversation", icon: ClipboardCopy, category: "Chat" },
];

export function CommandPalette() {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState<"commands" | "themes">("commands");
  const inputRef = useRef<HTMLInputElement>(null);

  const applyTheme = (next: Theme) => {
    setTheme(next);
    void getSettings()
      .then((settings) => updateSettings({ ...settings, theme: next }))
      .catch(() => {});
    setCommandPaletteOpen(false);
  };

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  const themes = THEMES.filter((t) =>
    t.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIdx(0);
      setMode("commands");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [commandPaletteOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const count = mode === "themes" ? themes.length : filtered.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, Math.max(count - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (mode === "themes") {
        const t = themes[selectedIdx];
        if (t) applyTheme(t.id);
      } else if (filtered[selectedIdx]) {
        executeCommand(filtered[selectedIdx].id);
      }
    } else if (e.key === "Escape") {
      if (mode === "themes") {
        setMode("commands");
        setQuery("");
      }
    }
  };

  const executeCommand = (id: string) => {
    const s = useAppStore.getState();

    switch (id) {
      case "toggle-sidebar":
        s.toggleSidebar();
        break;
      case "toggle-right":
        s.toggleRightPanel();
        break;
      case "open-git":
        s.setRightPanel("git"); s.setRightPanelOpen(true); break;
      case "open-terminal":
        s.setRightPanel("terminal"); s.setRightPanelOpen(true); break;
      case "open-build":
        s.setRightPanel("build"); s.setRightPanelOpen(true); break;
      case "open-debug":
        s.setRightPanel("debug"); s.setRightPanelOpen(true); break;
      case "open-sessions":
        s.setRightPanel("sessions"); s.setRightPanelOpen(true); break;
      case "open-providers":
        s.setRightPanel("providers"); s.setRightPanelOpen(true); break;
      case "open-settings":
        s.setRightPanel("settings"); s.setRightPanelOpen(true); break;
      case "change-theme":
        setMode("themes");
        setQuery("");
        return;
      case "new-chat":
        void useChatStore.getState().clearMessages();
        break;
      case "regenerate":
        void useChatStore.getState().regenerate();
        break;
      case "copy-conversation": {
        const text = useChatStore
          .getState()
          .messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
          .join("\n\n");
        navigator.clipboard
          .writeText(text)
          .then(() => notify("success", "Conversation copied", ""))
          .catch(() => notify("error", "Copy failed", ""));
        break;
      }
    }
    s.setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg glass-elevated overflow-hidden animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          {mode === "themes" && (
            <button
              onClick={() => {
                setMode("commands");
                setQuery("");
              }}
              className="p-1 text-text-muted hover:text-text-primary transition-fast"
              title="Back to commands"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          {mode === "commands" && (
            <Search size={16} className="text-text-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={mode === "themes" ? "Search themes..." : "Type a command..."}
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-text-muted hover:text-text-primary transition-fast"
          >
            <X size={14} />
          </button>
        </div>

        {mode === "themes" ? (
          <div className="max-h-[300px] overflow-y-auto py-1">
            {themes.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-muted text-sm">
                No themes found
              </div>
            ) : (
              themes.map((t) => {
                const active = t.id === theme;
                return (
                  <button
                    key={t.id}
                    onClick={() => applyTheme(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-fast
                      ${
                        active
                          ? "bg-bg-elevated text-text-primary"
                          : "text-text-secondary hover:bg-bg-elevated"
                      }`}
                  >
                    <span
                      className="w-8 h-6 rounded border border-border-subtle shrink-0 flex items-center justify-center text-[9px] font-mono"
                      style={{ backgroundColor: t.bg, color: t.accent }}
                    >
                      Aa
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block font-medium text-text-primary">
                        {t.label}
                      </span>
                      <span className="block text-[11px] text-text-muted">
                        {t.description} · {t.tier}
                      </span>
                    </span>
                    {active && (
                      <Check size={14} className="text-accent-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          /* Results */
          <div className="max-h-[300px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-muted text-sm">
                No commands found
              </div>
            ) : (
              filtered.map((cmd, idx) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => executeCommand(cmd.id)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-fast
                      ${
                        idx === selectedIdx
                          ? "bg-bg-elevated text-text-primary"
                          : "text-text-secondary hover:bg-bg-elevated"
                      }`}
                  >
                    <Icon size={16} className="shrink-0 opacity-50" />
                    <span className="flex-1 text-left">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[11px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded font-mono">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
