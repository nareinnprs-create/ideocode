import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import {
  listIssues,
  searchIssues,
  fetchGithubIssues,
  type Issue,
} from "../../lib/tauri-commands";
import { ArrowLeft, AlertCircle, Search, ExternalLink, RefreshCw } from "lucide-react";

export function IssuePanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [showFetch, setShowFetch] = useState(false);

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listIssues();
      setIssues(result);
    } catch (e) {
      setError(`Failed to load issues: ${e}`);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      loadIssues();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await searchIssues(query);
      setIssues(result);
    } catch (e) {
      setError(`Search failed: ${e}`);
    }
    setLoading(false);
  };

  const handleFetch = async () => {
    if (!owner.trim() || !repo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await fetchGithubIssues(
        owner.trim(),
        repo.trim(),
        token.trim()
      );
      await loadIssues();
      setShowFetch(false);
    } catch (e) {
      setError(`Fetch failed: ${e}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Issues">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <button
          onClick={() => setShowFetch(!showFetch)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent-hover transition-fast rounded hover:bg-surface-elevated"
        >
          <RefreshCw size={14} />
          Fetch
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search issues..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-2 py-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-muted hover:text-fg-primary transition-fast"
          >
            Go
          </button>
        </div>
      </div>

      {/* Fetch form */}
      {showFetch && (
        <div className="mx-3 mb-2 p-2 rounded bg-surface-elevated border border-border-subtle">
          <div className="flex gap-1 mb-1">
            <input
              type="text"
              placeholder="Owner (e.g. facebook)"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="flex-1 p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <span className="flex items-center text-fg-muted text-xs">/</span>
            <input
              type="text"
              placeholder="Repo (e.g. react)"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="flex-1 p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <input
            type="password"
            placeholder="GitHub token (optional for public repos)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary placeholder-text-muted focus:outline-none focus:border-accent mb-1"
          />
          <button
            onClick={handleFetch}
            disabled={!owner.trim() || !repo.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast"
          >
            Fetch Issues
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-fg-muted text-xs animate-pulse">
            <RefreshCw size={14} className="animate-spin" />
            Loading issues...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 my-2 p-2 rounded bg-surface-elevated border border-border-subtle">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-error mt-0.5 shrink-0" />
            <div className="text-xs text-error">{error}</div>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && issues.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-fg-muted">
          <AlertCircle size={24} className="mb-2 opacity-50" />
          <div className="text-xs">No issues loaded</div>
          <div className="text-[11px] mt-1">Click Fetch to load issues from GitHub</div>
        </div>
      )}

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto py-1">
        {issues.map((issue) => (
          <div
            key={`${issue.source}-${issue.id}`}
            className="px-3 py-2 border-b border-border-subtle last:border-none hover:bg-surface-elevated transition-fast group"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      issue.state === "open" ? "bg-success" : "bg-text-muted"
                    }`}
                  />
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-fg-primary hover:text-accent truncate"
                  >
                    {issue.title}
                  </a>
                  <ExternalLink size={10} className="text-fg-muted shrink-0 opacity-0 group-hover:opacity-100" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-fg-muted">
                    {issue.repository}
                  </span>
                  <span className="text-[11px] text-fg-muted">#{issue.id}</span>
                  <span className={`text-[11px] px-1 rounded ${
                    issue.state === "open" ? "bg-success/10 text-success" : "bg-text-muted/10 text-fg-muted"
                  }`}>
                    {issue.state}
                  </span>
                </div>
                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {issue.labels.map((label) => (
                      <span
                        key={label}
                        className="text-[11px] px-1 py-0.5 rounded bg-accent/10 text-accent"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {issue.body && (
                  <div className="text-[11px] text-fg-muted mt-1 line-clamp-2">
                    {issue.body.slice(0, 200)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
