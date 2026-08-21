import { useState, useEffect, useCallback } from "react";
import { useStore } from "zustand";
import { Clock, FileEdit, GitCommit, Bot, MessageCircle, Trash2 } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useGitStore } from "../../stores/gitStore";
import { useFileStore } from "../../stores/fileStore";

interface TimelineEntry {
  id: string;
  type: "file-edit" | "git-commit" | "agent-action" | "message";
  title: string;
  description?: string;
  timestamp: number;
}

const TYPE_ICONS = {
  "file-edit": FileEdit,
  "git-commit": GitCommit,
  "agent-action": Bot,
  message: MessageCircle,
};

const TYPE_COLORS = {
  "file-edit": "text-accent",
  "git-commit": "text-success",
  "agent-action": "text-warning",
  message: "text-info",
};

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

function generateEntries(
  messages: { id: string; role: string; content: string; timestamp?: number }[],
  gitStatus: { staged: { path: string }[] } | null,
  openFiles: string[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const msg of messages) {
    entries.push({
      id: `msg-${msg.id}`,
      type: msg.role === "assistant" ? "agent-action" : "message",
      title: msg.role === "assistant" ? "Agent responded" : "User message sent",
      description: msg.content.slice(0, 80),
      timestamp: msg.timestamp ?? 0,
    });
  }

  if (gitStatus && gitStatus.staged.length > 0) {
    const fileNames = gitStatus.staged.map((f) => f.path.split(/[/\\]/).pop()).join(", ");
    entries.push({
      id: `git-staged-${Date.now()}`,
      type: "git-commit",
      title: `${gitStatus.staged.length} file(s) staged`,
      description: fileNames,
      timestamp: Date.now(),
    });
  }

  for (const filePath of openFiles) {
    const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
    entries.push({
      id: `file-${filePath}`,
      type: "file-edit",
      title: `Opened ${fileName}`,
      description: filePath,
      timestamp: Date.now(),
    });
  }

  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export function TimelinePanel() {
  const messages = useStore(useChatStore, (s) => s.messages);
  const gitStatus = useStore(useGitStore, (s) => s.status);
  const openFiles = useStore(useFileStore, (s) => s.openFiles);

  const [entries, setEntries] = useState<TimelineEntry[]>([]);

  const rebuild = useCallback(() => {
    setEntries(generateEntries(messages, gitStatus, openFiles));
  }, [messages, gitStatus, openFiles]);

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  const clearTimeline = () => setEntries([]);

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Timeline">
      <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2">
        <Clock size={14} className="text-accent" />
        <span className="text-xs font-semibold text-fg-primary">Timeline</span>
        <div className="flex-1" />
        <button
          onClick={clearTimeline}
          aria-label="Clear timeline"
          className="p-1 rounded hover:bg-surface-hover text-fg-muted hover:text-fg-primary transition-colors"
          title="Clear Timeline"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="relative">
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border-subtle" />
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <Clock size={24} className="mb-2 opacity-40" />
              <div className="text-xs">No events yet</div>
              <div className="text-[10px] text-fg-muted mt-1">Activity will appear here as you work</div>
            </div>
          )}
          {entries.map((entry) => {
            const Icon = TYPE_ICONS[entry.type];
            return (
              <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                <div
                  className={`shrink-0 w-6 h-6 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center z-10 ${TYPE_COLORS[entry.type]}`}
                >
                  <Icon size={12} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-xs font-medium text-fg-primary">
                    {entry.title}
                  </div>
                  {entry.description && (
                    <div className="text-[11px] text-fg-muted mt-0.5 truncate">
                      {entry.description}
                    </div>
                  )}
                  <div className="text-[10px] text-fg-muted mt-1">
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
