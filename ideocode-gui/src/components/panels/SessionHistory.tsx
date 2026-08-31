import { useEffect, useState } from "react";
import { useChatStore } from "../../stores/chatStore";
import {
  MessageSquare,
  Trash2,
  Search,
  Clock,
  Tag,
  Download,
  Play,
  Pencil,
  Check,
} from "lucide-react";
import { exportSession } from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";
import type { Session } from "../../lib/tauri-commands";

export function SessionHistory() {
  const { sessions, loadSessions } = useChatStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "saved" | "recent">("all");

  useEffect(() => {
    loadSessions();
  }, []);

  const filtered = sessions
    .filter((s) => {
      if (s.side) return false;
      if (filter === "saved" && !s.save_label) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.save_label?.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .slice(0, filter === "recent" ? 10 : 50);

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Session history">
      {/* Filter tabs */}
      <div className="flex gap-px px-2 py-2 border-b border-border-subtle bg-surface-elevated">
        {(["all", "recent", "saved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-t transition-fast uppercase tracking-wider
              ${
                filter === f
                  ? "text-accent bg-surface border-b-2 border-accent"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border-subtle surface-blur">
        <div className="flex items-center gap-1.5 bg-surface rounded px-2 py-1.5 border border-border-subtle">
          <Search size={12} className="text-fg-muted shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            aria-label="Search sessions"
            className="flex-1 bg-transparent text-fg-primary text-[11px] outline-none placeholder:text-fg-muted"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
            <MessageSquare size={24} className="mb-2 opacity-40" />
            <div className="text-xs">{search ? "No sessions match your search" : "No sessions yet"}</div>
            {!search && <div className="text-[10px] text-fg-muted mt-1">Start a chat to create your first session</div>}
          </div>
        ) : (
          filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 border-t border-border-subtle text-[11px] text-fg-muted">
        {sessions.filter((s) => !s.side).length} total sessions
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: Session }) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title || "");
  const deleteSession = useChatStore((s) => s.deleteSession);
  const loadSession = useChatStore((s) => s.loadSession);
  const renameSession = useChatStore((s) => s.renameSession);
  const time = formatTime(session.updated_at);

  const commitRename = async () => {
    const title = draft.trim();
    if (title && title !== session.title) {
      await renameSession(session.id, title);
    }
    setEditing(false);
  };

  return (
    <div className="group px-3 py-2 hover:bg-surface-elevated transition-fast border-b border-border-subtle/50">
      <div className="flex items-start gap-2">
        <MessageSquare size={14} className="shrink-0 text-fg-muted mt-0.5" />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(session.title || "");
                  setEditing(false);
                }
              }}
              onBlur={commitRename}
              className="w-full text-[13px] font-medium bg-surface border border-accent rounded px-1.5 py-0.5 text-fg-primary outline-none"
            />
          ) : (
            <button
              onClick={() => loadSession(session.id)}
              title="Resume session"
              className="text-[13px] text-fg-primary truncate font-medium hover:text-accent transition-fast block max-w-full"
            >
              {session.title || "Untitled Session"}
            </button>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-fg-muted">
              <MessageSquare size={10} />
              {session.message_count} msgs
            </span>
            <span className="flex items-center gap-1 text-[11px] text-fg-muted">
              <Clock size={10} />
              {time}
            </span>
            {session.save_label && (
              <span className="flex items-center gap-1 text-[11px] text-accent">
                <Tag size={10} />
                {session.save_label}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => loadSession(session.id)}
          title="Resume session"
          aria-label="Resume session"
          className="opacity-0 group-hover:opacity-100 p-1 text-fg-muted hover:text-accent transition-fast"
        >
          <Play size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDraft(session.title || "");
            setEditing(true);
          }}
          title="Rename session"
          aria-label="Rename session"
          className="opacity-0 group-hover:opacity-100 p-1 text-fg-muted hover:text-accent transition-fast"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleting(!deleting);
          }}
          aria-label="Delete session"
          className="opacity-0 group-hover:opacity-100 p-1 text-fg-muted hover:text-error transition-fast"
        >
          <Trash2 size={12} />
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const md = await exportSession(session.id, "markdown");
              const blob = new Blob([md], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${session.title || "session"}.md`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              notify("error", "Export failed", `${err}`);
            }
          }}
          aria-label="Export session"
          className="opacity-0 group-hover:opacity-100 p-1 text-fg-muted hover:text-accent transition-fast"
        >
          <Download size={12} />
        </button>
      </div>

      {editing && (
        <div className="mt-2 flex items-center gap-2 px-1">
          <span className="text-[11px] text-fg-muted flex-1">Press Enter to save, Esc to cancel</span>
          <button
            className="px-2 py-0.5 text-[11px] bg-accent text-white rounded hover:opacity-80"
            onClick={commitRename}
          >
            <Check size={11} />
          </button>
        </div>
      )}

      {deleting && (
        <div className="mt-2 px-2 py-1.5 bg-error/10 rounded border border-error/30 flex items-center gap-2">
          <span className="text-[11px] text-error flex-1">Delete session?</span>
          <button
            className="px-2 py-0.5 text-[11px] bg-error text-white rounded hover:bg-error/80"
            onClick={(e) => {
              e.stopPropagation();
              deleteSession(session.id);
              setDeleting(false);
            }}
          >
            Yes
          </button>
          <button
            className="px-2 py-0.5 text-[11px] bg-surface-elevated text-fg-secondary rounded hover:bg-surface-hover"
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(false);
            }}
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(unix: number): string {
  const now = Date.now() / 1000;
  const diff = now - unix;

  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  const date = new Date(unix * 1000);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
