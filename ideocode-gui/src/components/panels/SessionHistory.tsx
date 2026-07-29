import { useEffect, useState } from "react";
import { useChatStore } from "../../stores/chatStore";
import { MessageSquare, Trash2, Search, Clock, Tag, Download } from "lucide-react";
import { exportSession } from "../../lib/tauri-commands";
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
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-px px-2 py-2 border-b border-border-subtle bg-bg-tertiary">
        {(["all", "recent", "saved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-t transition-fast uppercase tracking-wider
              ${
                filter === f
                  ? "text-accent-primary bg-bg-secondary border-b-2 border-accent-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-1.5 bg-bg-primary rounded px-2 py-1.5 border border-border-subtle">
          <Search size={12} className="text-text-muted shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="flex-1 bg-transparent text-text-primary text-[11px] outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-text-muted text-xs">
            {search
              ? "No sessions match your search"
              : "No sessions yet. Start a chat!"}
          </div>
        ) : (
          filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))
        )}
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 border-t border-border-subtle text-[10px] text-text-muted">
        {sessions.length} total sessions
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: Session }) {
  const [deleting, setDeleting] = useState(false);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const time = formatTime(session.updated_at);

  return (
    <div className="group px-3 py-2 hover:bg-bg-elevated transition-fast cursor-pointer border-b border-border-subtle/50">
      <div className="flex items-start gap-2">
        <MessageSquare size={14} className="shrink-0 text-text-muted mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-primary truncate font-medium">
            {session.title || "Untitled Session"}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <MessageSquare size={10} />
              {session.message_count} msgs
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <Clock size={10} />
              {time}
            </span>
            {session.save_label && (
              <span className="flex items-center gap-1 text-[10px] text-accent-tertiary">
                <Tag size={10} />
                {session.save_label}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleting(!deleting);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-error transition-fast"
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
              console.error("Export failed:", err);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-accent-primary transition-fast"
        >
          <Download size={12} />
        </button>
      </div>

      {deleting && (
        <div className="mt-2 px-2 py-1.5 bg-error/10 rounded border border-error/30 flex items-center gap-2">
          <span className="text-[10px] text-error flex-1">Delete session?</span>
          <button
            className="px-2 py-0.5 text-[10px] bg-error text-white rounded hover:bg-error/80"
            onClick={(e) => {
              e.stopPropagation();
              deleteSession(session.id);
              setDeleting(false);
            }}
          >
            Yes
          </button>
          <button
            className="px-2 py-0.5 text-[10px] bg-bg-elevated text-text-secondary rounded hover:bg-bg-hover"
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
