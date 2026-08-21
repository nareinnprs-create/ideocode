import { useState, useRef, useEffect } from "react";
import { Search, File, FileText, ArrowLeft } from "lucide-react";
import { searchFiles, searchContents, searchSemantic, indexDirectory } from "../../lib/tauri-commands";
import { useFileStore } from "../../stores/fileStore";
import { useAppStore } from "../../stores/appStore";
import type { SearchResult, CodeSearchResult } from "../../lib/tauri-commands";

type SearchMode = "filename" | "content" | "semantic";

export function SearchPanel() {
  const rootPath = useFileStore((s) => s.rootPath);
  const setRootPath = useFileStore((s) => s.setRootPath);
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [query, setQuery] = useState("");
  const [pathDraft, setPathDraft] = useState(rootPath);
  const [mode, setMode] = useState<SearchMode>("filename");
  const [results, setResults] = useState<SearchResult[] | CodeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexStats, setIndexStats] = useState<{ files_indexed: number; total_files: number } | null>(null);
  const pathDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep the draft in sync when the workspace root changes elsewhere.
  useEffect(() => {
    setPathDraft(rootPath);
  }, [rootPath]);

  // Debounce root-path commits so FileExplorer/GitPanel do not fire a backend
  // round-trip for every keystroke typed in the path box.
  const handlePathChange = (value: string) => {
    setPathDraft(value);
    if (pathDebounceRef.current) clearTimeout(pathDebounceRef.current);
    pathDebounceRef.current = setTimeout(() => {
      if (value !== useFileStore.getState().rootPath) {
        setRootPath(value);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (pathDebounceRef.current) clearTimeout(pathDebounceRef.current);
    };
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      if (mode === "filename") {
        const r = await searchFiles(query, rootPath || ".");
        setResults(r);
      } else if (mode === "content") {
        const r = await searchContents(rootPath || ".", query);
        setResults(r);
      } else if (mode === "semantic") {
        const r = await searchSemantic(rootPath || ".", query);
        setResults(r);
      }
    } catch (e) {
      setError(`${e}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleIndex = async () => {
    setIndexing(true);
    setError(null);
    try {
      const stats = await indexDirectory(rootPath || ".");
      setIndexStats({ files_indexed: stats.files_indexed, total_files: stats.total_files });
    } catch (e) {
      setError(`Indexing failed: ${e}`);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Search panel">
      {/* Header */}
      <div className="px-1 pt-1 flex items-center justify-between">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex gap-0.5">
            <button
              onClick={() => { setMode("filename"); setResults([]); setSearched(false); }}
              aria-label="Search by filename"
              className={`px-2 py-1 text-[11px] rounded transition-fast ${
              mode === "filename"
                ? "bg-accent text-white"
                : "text-fg-muted hover:text-fg-primary"
            }`}
          >
            Files
          </button>
            <button
              onClick={() => { setMode("content"); setResults([]); setSearched(false); }}
              aria-label="Search file contents"
              className={`px-2 py-1 text-[11px] rounded transition-fast ${
              mode === "content"
                ? "bg-accent text-white"
                : "text-fg-muted hover:text-fg-primary"
            }`}
          >
            Content
          </button>
            <button
              onClick={() => { setMode("semantic"); setResults([]); setSearched(false); }}
              aria-label="Search semantically"
              className={`px-2 py-1 text-[11px] rounded transition-fast ${
              mode === "semantic"
                ? "bg-accent text-white"
                : "text-fg-muted hover:text-fg-primary"
            }`}
          >
            Semantic
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 bg-surface rounded-lg px-2.5 py-1.5 border border-border-subtle focus-within:border-accent">
          {mode === "filename" ? (
            <Search size={14} className="text-fg-muted shrink-0" />
          ) : (
            <FileText size={14} className="text-fg-muted shrink-0" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={mode === "filename" ? "Search filenames..." : "Search file contents..."}
            aria-label="Search across files"
            className="flex-1 bg-transparent text-fg-primary text-xs outline-none placeholder:text-fg-muted"
          />
        </div>
        {/* Custom path input */}
        <div className="mt-1">
          <input
            type="text"
            value={pathDraft}
            onChange={(e) => handlePathChange(e.target.value)}
            placeholder="Search path (default: project root)"
            className="w-full px-2.5 py-1 text-[11px] bg-surface-elevated border border-border-subtle rounded text-fg-muted placeholder:text-fg-muted/50 focus:outline-none focus:border-accent font-mono"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 p-2 rounded bg-surface-elevated border border-border-subtle">
          <div className="text-xs text-error">{error}</div>
        </div>
      )}

      {/* Indexing Controls for Semantic */}
      {mode === "semantic" && (
        <div className="mx-3 mb-2 p-2 rounded bg-surface-elevated border border-border-subtle flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-fg-muted">Semantic Index</span>
            <button
              onClick={handleIndex}
              disabled={indexing}
              className="px-2 py-0.5 text-[10px] bg-accent text-white rounded hover:bg-accent-secondary disabled:opacity-50"
            >
              {indexing ? "Indexing..." : "Reindex Workspace"}
            </button>
          </div>
          {indexStats && (
            <div className="text-[10px] text-fg-muted">
              Indexed {indexStats.files_indexed} / {indexStats.total_files} files
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!searched && (
          <div className="p-4 text-center text-fg-muted text-xs">
            {mode === "filename"
              ? "Type a filename pattern and press Enter"
              : "Type content to search for and press Enter"}
          </div>
        )}

        {searched && loading && (
          <div className="p-4 text-center text-fg-muted text-xs animate-pulse">
            Searching...
          </div>
        )}

        {searched && !loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
            <Search size={24} className="mb-2 opacity-40" />
            <div className="text-xs">No results found</div>
            <div className="text-[10px] text-fg-muted mt-1">Try a different search term or mode</div>
          </div>
        )}

        {searched && !loading && results.length > 0 && (
          <div className="px-3 py-1 text-[11px] text-fg-muted">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </div>
        )}

        {results.map((r, i) => (
          <div
            key={`${r.file}-${i}`}
            className="flex items-start gap-2 px-3 py-1.5 hover:bg-surface-elevated cursor-pointer text-xs border-b border-border-subtle last:border-none"
          >
            <File size={14} className="shrink-0 text-accent mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-fg-secondary truncate font-mono text-[11px]">
                {r.file.split(/[/\\]/).pop()}
                {"line" in r && (r as CodeSearchResult).line > 0 && (
                  <span className="text-fg-muted ml-1">:{(r as CodeSearchResult).line}</span>
                )}
              </div>
              <div className="text-fg-muted truncate text-[11px]">
                {r.file}
              </div>
              {"content" in r && r.content && (
                <div className="text-[11px] text-fg-muted mt-0.5 font-mono truncate">
                  {(r as CodeSearchResult).content.slice(0, 150)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
