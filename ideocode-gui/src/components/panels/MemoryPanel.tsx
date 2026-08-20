import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useMemoryStore } from "../../stores/memoryStore";
import { useAppStore } from "../../stores/appStore";
import { type MemoryEntry } from "../../lib/tauri-commands";
import { ContextMenu, type ContextMenuItem } from "../ui/ContextMenu";
import { Brain, Search, Plus, Trash2, ArrowLeft, BookOpen, Pencil, Copy, ArrowUpDown } from "lucide-react";

type SortMode = "newest" | "oldest" | "alpha";

const CATEGORIES = ["All", "General", "Fact", "Preference", "Entity", "Correction"] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

function entryCategoryFilter(entry: MemoryEntry, filter: CategoryFilter): boolean {
  if (filter === "All") return true;
  return entry.category.toLowerCase() === filter.toLowerCase();
}

function sortEntries(entries: MemoryEntry[], mode: SortMode): MemoryEntry[] {
  const copy = [...entries];
  switch (mode) {
    case "newest":
      return copy.sort((a, b) => b.created_at - a.created_at);
    case "oldest":
      return copy.sort((a, b) => a.created_at - b.created_at);
    case "alpha":
      return copy.sort((a, b) => a.content.localeCompare(b.content));
  }
}

export function MemoryPanel() {
  const {
    entries,
    loading,
    error,
    searchQuery,
    loadMemories,
    searchMemories,
    storeMemory,
    deleteMemory,
    setSearchQuery,
  } = useMemoryStore();
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);

  const [input, setInput] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("general");
  const [showAdd, setShowAdd] = useState(false);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("All");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editingId]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    window.addEventListener("pointerdown", handleClick);
    return () => window.removeEventListener("pointerdown", handleClick);
  }, [showSortMenu]);

  const filtered = useMemo(() => {
    return sortEntries(entries.filter((e) => entryCategoryFilter(e, activeFilter)), sortMode);
  }, [entries, activeFilter, sortMode]);

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (q.trim()) {
        searchMemories(q);
      } else {
        loadMemories();
      }
    },
    [setSearchQuery, searchMemories, loadMemories],
  );

  const handleAdd = useCallback(async () => {
    if (!input.trim()) return;
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await storeMemory(input.trim(), tagList, category);
    setInput("");
    setTags("");
    setShowAdd(false);
  }, [input, tags, category, storeMemory]);

  const startEdit = useCallback((entry: MemoryEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  }, []);

  const commitEdit = useCallback(
    async (entry: MemoryEntry) => {
      const trimmed = editContent.trim();
      if (trimmed && trimmed !== entry.content) {
        await deleteMemory(entry.id);
        await storeMemory(trimmed, entry.tags, entry.category);
      }
      setEditingId(null);
      setEditContent("");
    },
    [editContent, deleteMemory, storeMemory],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditContent("");
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, entry: MemoryEntry) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitEdit(entry);
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit],
  );

  const copyContent = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  }, []);

  const buildContextMenuItems = useCallback(
    (entry: MemoryEntry): ContextMenuItem[] => [
      {
        id: "edit",
        label: "Edit",
        icon: <Pencil size={12} />,
        onSelect: () => startEdit(entry),
      },
      {
        id: "copy",
        label: "Copy",
        icon: <Copy size={12} />,
        onSelect: () => copyContent(entry.content),
      },
      {
        id: "delete",
        label: "Delete",
        icon: <Trash2 size={12} />,
        danger: true,
        onSelect: () => deleteMemory(entry.id),
      },
    ],
    [startEdit, copyContent, deleteMemory],
  );

  const SORT_LABELS: Record<SortMode, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    alpha: "Alphabetical",
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Memory panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            aria-label="Search memories"
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
          />
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle">
          <textarea
            placeholder="What do you want to remember?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Memory content"
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary placeholder-text-muted resize-none h-20 focus:outline-none focus:border-accent-primary"
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            aria-label="Memory tags"
            className="w-full mt-1 p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
          />
          <div className="flex items-center gap-2 mt-1">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="general">General</option>
              <option value="fact">Fact</option>
              <option value="preference">Preference</option>
              <option value="entity">Entity</option>
              <option value="correction">Correction</option>
            </select>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover transition-fast"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-text-muted text-xs animate-pulse">
            <Brain size={14} />
            Loading memories...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 my-2 p-2 rounded bg-bg-elevated border border-border-subtle">
          <div className="text-xs text-error">{error}</div>
        </div>
      )}

      {/* Category filter chips */}
      {!loading && !error && entries.length > 0 && (
        <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={[
                "shrink-0 px-2.5 py-1 text-[11px] rounded-full border transition-fast",
                activeFilter === cat
                  ? "bg-accent-primary/15 border-accent-primary text-accent-primary"
                  : "bg-bg-tertiary border-border-subtle text-text-muted hover:text-text-primary hover:border-border-default",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
          <div className="relative ml-auto shrink-0" ref={sortRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-border-subtle bg-bg-tertiary text-text-muted hover:text-text-primary hover:border-border-default transition-fast"
            >
              <ArrowUpDown size={11} />
              {SORT_LABELS[sortMode]}
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-36 py-1 rounded-lg border border-border-default bg-bg-elevated shadow-pop">
                {(["newest", "oldest", "alpha"] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setSortMode(mode);
                      setShowSortMenu(false);
                    }}
                    className={[
                      "w-full text-left px-3 py-1.5 text-xs transition-colors",
                      sortMode === mode
                        ? "text-accent-primary bg-accent-primary/10"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
                    ].join(" ")}
                  >
                    {SORT_LABELS[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-text-muted">
          <BookOpen size={24} className="mb-2 opacity-50" />
          <div className="text-xs">
            {entries.length === 0 ? "No memories yet" : "No matching memories"}
          </div>
          <div className="text-[11px] mt-1">
            {entries.length === 0 ? "Click Add to store your first memory" : "Try a different filter or search query"}
          </div>
        </div>
      )}

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.map((entry) => {
          const isEditing = editingId === entry.id;
          return (
            <ContextMenu key={entry.id} items={buildContextMenuItems(entry)}>
              <div className="px-3 py-2 border-b border-border-subtle last:border-none hover:bg-bg-elevated transition-fast group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <textarea
                        ref={editRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onBlur={() => commitEdit(entry)}
                        onKeyDown={(e) => handleEditKeyDown(e, entry)}
                        className="w-full p-1.5 text-xs bg-bg-tertiary border border-accent-primary rounded text-text-primary resize-none focus:outline-none"
                        rows={3}
                      />
                    ) : (
                      <div
                        className="text-xs text-text-primary break-words whitespace-pre-wrap cursor-pointer hover:bg-accent-primary/5 rounded px-0.5 -mx-0.5"
                        onClick={() => startEdit(entry)}
                        title="Click to edit"
                      >
                        {entry.content}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted uppercase">
                        {entry.category}
                      </span>
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-text-muted mt-1">
                      {new Date(entry.created_at * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMemory(entry.id)}
                    className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </ContextMenu>
          );
        })}
      </div>
    </div>
  );
}
