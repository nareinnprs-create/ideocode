import { useEffect, useState } from "react";
import { useGitStore } from "../../stores/gitStore";
import { useFileStore } from "../../stores/fileStore";
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  Plus,
  Minus,
  AlertTriangle,
} from "lucide-react";

export function GitPanel() {
  const { rootPath } = useFileStore();
  const { status, loading, loadStatus, commit } = useGitStore();
  const [commitMsg, setCommitMsg] = useState("");

  useEffect(() => {
    loadStatus(rootPath);
  }, [rootPath]);

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    await commit(rootPath, commitMsg);
    setCommitMsg("");
  };

  if (!status) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-xs">
        {loading ? "Loading..." : "Not a git repository"}
      </div>
    );
  }

  const totalChanges =
    status.staged.length + status.modified.length + status.untracked.length;

  return (
    <div className="flex flex-col h-full">
      {/* Branch info */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <GitBranch size={14} className="text-accent-primary" />
        <span className="text-xs font-mono text-text-primary">{status.branch}</span>
        {status.ahead > 0 && (
          <span className="text-[10px] text-success">↑{status.ahead}</span>
        )}
        {status.behind > 0 && (
          <span className="text-[10px] text-warning">↓{status.behind}</span>
        )}
        <button
          onClick={() => loadStatus(rootPath)}
          className="ml-auto p-1 text-text-muted hover:text-text-primary transition-fast"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* File lists */}
      <div className="flex-1 overflow-y-auto">
        {status.staged.length > 0 && (
          <FileSection
            title="Staged"
            icon={<Plus size={12} className="text-success" />}
            files={status.staged}
          />
        )}

        {status.modified.length > 0 && (
          <FileSection
            title="Modified"
            icon={<Minus size={12} className="text-warning" />}
            files={status.modified}
          />
        )}

        {status.untracked.length > 0 && (
          <FileSection
            title="Untracked"
            icon={<AlertTriangle size={12} className="text-info" />}
            files={status.untracked}
          />
        )}

        {status.conflicted.length > 0 && (
          <FileSection
            title="Conflicts"
            icon={<AlertTriangle size={12} className="text-error" />}
            files={status.conflicted}
          />
        )}

        {totalChanges === 0 && (
          <div className="px-3 py-4 text-center text-text-muted text-xs">
            Working tree clean
          </div>
        )}
      </div>

      {/* Commit input */}
      <div className="p-2 border-t border-border-subtle">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCommit()}
            placeholder="Commit message..."
            className="flex-1 bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle
              placeholder:text-text-muted outline-none focus:border-accent-primary"
          />
          <button
            onClick={handleCommit}
            disabled={!commitMsg.trim() || totalChanges === 0}
            className="px-2 py-1.5 rounded bg-accent-primary text-white text-xs
              hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-fast"
          >
            <GitCommit size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FileSection({
  title,
  icon,
  files,
}: {
  title: string;
  icon: React.ReactNode;
  files: { path: string; status: string }[];
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-wider text-text-muted">
        {icon}
        {title}
        <span className="ml-1 opacity-50">({files.length})</span>
      </div>
      {files.map((f) => (
        <div
          key={f.path}
          className="flex items-center gap-2 px-3 py-0.5 text-xs text-text-secondary hover:bg-bg-elevated cursor-pointer"
        >
          <span className="font-mono text-[10px] text-text-muted w-4 text-center">
            {f.status.trim() || "?"}
          </span>
          <span className="truncate">{f.path}</span>
        </div>
      ))}
    </div>
  );
}
