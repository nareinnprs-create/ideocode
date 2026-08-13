import { useEffect, useState } from "react";
import { useMemoryStore } from "../../stores/memoryStore";
import { useAppStore } from "../../stores/appStore";
import { Brain, Search, Plus, Trash2, ArrowLeft, BookOpen } from "lucide-react";

export function MemoryPanel() {
  const { entries, loading, error, searchQuery, loadMemories, searchMemories, storeMemory, deleteMemory, setSearchQuery } =
    useMemoryStore();
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [input, setInput] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("general");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim()) {
      searchMemories(q);
    } else {
      loadMemories();
    }
  };

  const handleAdd = async () => {
    if (!input.trim()) return;
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await storeMemory(input.trim(), tagList, category);
    setInput("");
    setTags("");
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full">
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
          className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-secondary transition-fast rounded hover:bg-bg-elevated"
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
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary placeholder-text-muted resize-none h-20 focus:outline-none focus:border-accent-primary"
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
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
              className="px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-secondary transition-fast"
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
          <div className="text-xs text-red-400">{error}</div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-text-muted">
          <BookOpen size={24} className="mb-2 opacity-50" />
          <div className="text-xs">No memories yet</div>
          <div className="text-[11px] mt-1">Click Add to store your first memory</div>
        </div>
      )}

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto py-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="px-3 py-2 border-b border-border-subtle last:border-none hover:bg-bg-elevated transition-fast group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-primary break-words whitespace-pre-wrap">
                  {entry.content}
                </div>
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
                className="p-1 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-fast"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
