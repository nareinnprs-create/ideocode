import { useEffect, useState } from "react";
import { useGitStore } from "../../stores/gitStore";
import { useFileStore } from "../../stores/fileStore";
import { gitLogGraph } from "../../lib/tauri-commands";
import { GitBranch, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface GitCommitNode {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  branchColor: string;
  parents: string[];
  tags?: string[];
}

const BRANCH_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
];

export function GitGraphPanel() {
  const { branches, loadStatus, loadBranches } = useGitStore();
  const { rootPath } = useFileStore();
  const [commits, setCommits] = useState<GitCommitNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  useEffect(() => {
    if (rootPath) {
      loadStatus(rootPath);
      loadBranches(rootPath);
    }
  }, [rootPath]);

  useEffect(() => {
    if (rootPath) loadGraph();
  }, [rootPath]);

  const loadGraph = async () => {
    if (!rootPath) return;
    setLoading(true);
    try {
      const result = await gitLogGraph(rootPath, 50);
      const colorMap = new Map<string, string>();
      let colorIdx = 0;
      const graph: GitCommitNode[] = result.map((c) => {
        const branch = c.branch ?? "main";
        const tags = branch && branch !== "" ? [branch] : [];
        if (!colorMap.has(branch)) {
          colorMap.set(branch, BRANCH_COLORS[colorIdx % BRANCH_COLORS.length]);
          colorIdx++;
        }
        return {
          hash: c.hash,
          shortHash: c.hash.substring(0, 7),
          message: c.message,
          author: c.author,
          date: formatDate(c.date),
          branchColor: colorMap.get(branch) ?? BRANCH_COLORS[0],
          parents: c.parents,
          tags,
        };
      });
      setCommits(graph);
    } catch (err) {
      console.error("Failed to load git graph:", err);
      setCommits([]);
    }
    setLoading(false);
  };

  const formatDate = (epoch: number) => {
    try {
      const dt = new Date(epoch * 1000);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return `${epoch}`;
    }
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Git graph panel">
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-subtle surface-blur">
        <span className="text-xs font-medium text-fg-secondary uppercase tracking-wider flex items-center gap-1.5">
          <GitBranch size={13} /> Git Graph
        </span>
        <button
          onClick={loadGraph}
          disabled={loading}
          aria-label="Refresh git graph"
          className="p-1 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated"
          title="Refresh graph"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {!rootPath ? (
        <div className="px-3 py-4 text-fg-muted text-xs text-center">
          Open a project to view git graph
        </div>
      ) : loading && commits.length === 0 ? (
        <div className="px-3 py-4 text-fg-muted text-xs text-center">
          Loading git history...
        </div>
      ) : commits.length === 0 ? (
        <div className="px-3 py-4 text-fg-muted text-xs text-center">
          No commits found
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {commits.map((commit) => {
            const isExpanded = expandedCommit === commit.hash;
            return (
              <div key={commit.hash} className="group">
                <div
                  className="flex items-start gap-2 px-3 py-2 hover:bg-surface-elevated transition-fast cursor-pointer border-b border-border-subtle/50"
                  onClick={() => setExpandedCommit(isExpanded ? null : commit.hash)}
                  role="button"
                  aria-expanded={isExpanded}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedCommit(isExpanded ? null : commit.hash); } }}
                >
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <div
                      className="w-3 h-3 rounded-full border-2 border-bg-primary"
                      style={{ backgroundColor: commit.branchColor }}
                    />
                    {isExpanded && (
                      <div
                        className="w-0.5 h-full min-h-[16px]"
                        style={{ backgroundColor: commit.branchColor + "40" }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-fg-muted">
                        {commit.shortHash}
                      </span>
                      {commit.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-fg-primary truncate mt-0.5">
                      {commit.message}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-fg-muted">
                      <span>{commit.author}</span>
                      <span>{commit.date}</span>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1 text-fg-muted opacity-0 group-hover:opacity-100 transition-fast">
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="ml-8 mb-2 px-3 py-2 bg-bg-surface rounded border border-border-subtle">
                    <div className="text-[11px] text-fg-muted space-y-1">
                      <div><span className="text-fg-secondary">Commit:</span> {commit.hash}</div>
                      <div><span className="text-fg-secondary">Parents:</span> {commit.parents.length > 0 ? commit.parents.map((p) => p.substring(0, 7)).join(", ") : "none"}</div>
                      <div><span className="text-fg-secondary">Author:</span> {commit.author}</div>
                      <div><span className="text-fg-secondary">Date:</span> {commit.date}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {branches.length > 0 && (
        <div className="px-3 py-2 border-t border-border-subtle text-[11px] text-fg-muted">
          {branches.filter((b) => b.current).map((b) => (
            <span key={b.name} className="flex items-center gap-1">
              <GitBranch size={11} className="text-accent" />
              {b.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
