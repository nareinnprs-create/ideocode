import { useState } from "react";
import { Search, File, Folder } from "lucide-react";
import { searchFiles } from "../../lib/tauri-commands";
import { useFileStore } from "../../stores/fileStore";
import type { SearchResult } from "../../lib/tauri-commands";

export function SearchPanel() {
  const { rootPath } = useFileStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await searchFiles(query, rootPath);
      setResults(r);
    } catch (e) {
      console.error("Search failed:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2 bg-bg-primary rounded-lg px-2.5 py-1.5 border border-border-subtle focus-within:border-accent-primary">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-text-primary text-xs outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!searched && (
          <div className="p-4 text-center text-text-muted text-xs">
            Type a search query and press Enter
          </div>
        )}

        {searched && loading && (
          <div className="p-4 text-center text-text-muted text-xs animate-pulse">
            Searching...
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="p-4 text-center text-text-muted text-xs">
            No results found
          </div>
        )}

        {results.map((r, i) => (
          <div
            key={`${r.file}-${i}`}
            className="flex items-start gap-2 px-3 py-1.5 hover:bg-bg-elevated cursor-pointer text-xs border-b border-border-subtle"
          >
            {r.file.includes("/") || r.file.includes("\\") ? (
              <Folder size={14} className="shrink-0 text-accent-primary mt-0.5" />
            ) : (
              <File size={14} className="shrink-0 text-text-muted mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="text-text-secondary truncate font-mono text-[11px]">
                {r.file.split(/[/\\]/).pop()}
              </div>
              <div className="text-text-muted truncate text-[10px]">
                {r.file}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
