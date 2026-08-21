import { useEffect, useState } from "react";
import { useGitStore } from "../../stores/gitStore";
import { useFileStore } from "../../stores/fileStore";
import { DiffViewer } from "../editor/DiffViewer";
import { ContextMenu } from "../ui/ContextMenu";
import type { ContextMenuItem } from "../ui/ContextMenu";
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  Plus,
  Minus,
  AlertTriangle,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Check,
  Copy,
  FileText,
} from "lucide-react";

export function GitPanel() {
  const { rootPath } = useFileStore();
  const {
    status, diff, loading, error, branches, branchesLoading,
    loadStatus, commit, loadDiff, stageFile, unstageFile,
    stageAll, unstageAll, loadBranches, checkoutBranch,
    stash, pull, push,
  } = useGitStore();
  const [commitMsg, setCommitMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [amend, setAmend] = useState(false);

  useEffect(() => {
    if (rootPath) {
      loadStatus(rootPath);
      loadBranches(rootPath);
    }
  }, [rootPath]);

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    await commit(rootPath, commitMsg, amend);
    setCommitMsg("");
    setAmend(false);
  };

  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-fg-muted text-xs">
        {loading ? "Loading..." : "Not a git repository"}
        {error && <div className="mt-2 text-error">{error}</div>}
      </div>
    );
  }

  const totalChanges = status.staged.length + status.modified.length + status.untracked.length;

  const currentBranchName = branches.find((b) => b.current)?.name ?? status.branch;

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Git panel">
      {error && (
        <div className="mx-3 mt-2 p-2 rounded bg-error/10 border border-error/30">
          <div className="text-xs text-error">{error}</div>
        </div>
      )}

      {/* Branch selector + actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle surface-blur">
        <div className="relative">
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            aria-label="Switch branch"
            aria-expanded={showBranchDropdown}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-surface-elevated border border-border-subtle hover:border-accent transition-fast"
          >
            <GitBranch size={13} className="text-accent" />
            <span className="font-mono text-fg-primary">{currentBranchName}</span>
            <ChevronDown size={11} className="text-fg-muted" />
          </button>
          {showBranchDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-48 py-1 rounded-lg border border-border-default bg-surface-elevated shadow-pop">
              {branchesLoading ? (
                <div className="px-3 py-2 text-xs text-fg-muted">Loading...</div>
              ) : (
                branches.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => {
                      if (!b.current) checkoutBranch(rootPath, b.name);
                      setShowBranchDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-fast ${
                      b.current ? "bg-accent/10 text-accent" : "text-fg-secondary hover:bg-surface-hover"
                    }`}
                  >
                    {b.current && <Check size={12} />}
                    <span className="font-mono">{b.name}</span>
                    {b.remote && <span className="text-fg-muted ml-auto">origin</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {status.ahead > 0 && <span className="text-[11px] text-success">↑{status.ahead}</span>}
        {status.behind > 0 && <span className="text-[11px] text-warning">↓{status.behind}</span>}

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => pull(rootPath)} aria-label="Pull" className="p-1.5 text-fg-muted hover:text-fg-primary rounded hover:bg-surface-elevated transition-fast" title="Pull">
            <ArrowDownToLine size={13} />
          </button>
          <button onClick={() => push(rootPath)} aria-label="Push" className="p-1.5 text-fg-muted hover:text-fg-primary rounded hover:bg-surface-elevated transition-fast" title="Push">
            <ArrowUpFromLine size={13} />
          </button>
          <button onClick={() => stash(rootPath)} aria-label="Stash changes" className="p-1.5 text-fg-muted hover:text-fg-primary rounded hover:bg-surface-elevated transition-fast" title="Stash">
            <Package size={13} />
          </button>
          <button onClick={() => { loadStatus(rootPath); loadBranches(rootPath); }} aria-label="Refresh git status" className="p-1 text-fg-muted hover:text-fg-primary transition-fast">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Diff view */}
      {selectedFile && (
        <div className="border-b border-border-subtle surface-blur">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[11px] uppercase tracking-wider text-fg-muted">Diff</span>
            <button onClick={() => setSelectedFile(null)} className="text-xs text-fg-muted hover:text-fg-primary">Close</button>
          </div>
          <DiffViewer file={selectedFile} diff={diff} height={224} />
        </div>
      )}

      {/* Quick actions */}
      {totalChanges > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-border-subtle surface-blur">
          {status.staged.length > 0 && (
            <button onClick={() => unstageAll(rootPath)} className="text-[11px] text-fg-muted hover:text-fg-primary px-2 py-0.5 rounded hover:bg-surface-elevated transition-fast">
              Unstage All ({status.staged.length})
            </button>
          )}
          {status.modified.length > 0 && (
            <button onClick={() => stageAll(rootPath)} className="text-[11px] text-fg-muted hover:text-fg-primary px-2 py-0.5 rounded hover:bg-surface-elevated transition-fast">
              Stage All ({status.modified.length})
            </button>
          )}
        </div>
      )}

      {/* File lists */}
      <div className="flex-1 overflow-y-auto">
        {status.staged.length > 0 && (
          <FileSection
            title="Staged"
            icon={<Plus size={12} className="text-success" />}
            files={status.staged}
            actionIcon={<Minus size={12} />}
            actionLabel="Unstage file"
            onActionClick={(p) => unstageFile(rootPath, p)}
            onFileClick={(p) => { setSelectedFile(p); loadDiff(rootPath, p); }}
          />
        )}
        {status.modified.length > 0 && (
          <FileSection
            title="Modified"
            icon={<Minus size={12} className="text-warning" />}
            files={status.modified}
            actionIcon={<Plus size={12} />}
            actionLabel="Stage file"
            onActionClick={(p) => stageFile(rootPath, p)}
            onFileClick={(p) => { setSelectedFile(p); loadDiff(rootPath, p); }}
          />
        )}
        {status.untracked.length > 0 && (
          <FileSection
            title="Untracked"
            icon={<AlertTriangle size={12} className="text-info" />}
            files={status.untracked}
            actionIcon={<Plus size={12} />}
            actionLabel="Stage file"
            onActionClick={(p) => stageFile(rootPath, p)}
            onFileClick={(p) => { setSelectedFile(p); loadDiff(rootPath, p); }}
          />
        )}
        {status.conflicted.length > 0 && (
          <FileSection
            title="Conflicts"
            icon={<AlertTriangle size={12} className="text-error" />}
            files={status.conflicted}
            actionIcon={<Plus size={12} />}
            actionLabel="Stage file"
            onActionClick={(p) => stageFile(rootPath, p)}
            onFileClick={(p) => { setSelectedFile(p); loadDiff(rootPath, p); }}
          />
        )}
        {totalChanges === 0 && (
          <div className="px-3 py-4 text-center text-fg-muted text-xs">Working tree clean</div>
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
            placeholder={amend ? "Amend message..." : "Commit message..."}
            className="flex-1 bg-surface text-fg-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-fg-muted outline-none focus:border-accent"
          />
            <button
              onClick={handleCommit}
              disabled={!commitMsg.trim() || totalChanges === 0}
              aria-label="Commit changes"
              className="px-2 py-1.5 rounded bg-accent text-white text-xs hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-fast"
            >
            <GitCommit size={14} />
          </button>
        </div>
        <button
          onClick={() => setAmend(!amend)}
          className={`mt-1 text-[11px] px-2 py-0.5 rounded transition-fast ${amend ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg-primary"}`}
        >
          {amend ? "✓ Amend" : "Amend last commit"}
        </button>
      </div>
    </div>
  );
}

function FileSection({
  title, icon, files, actionIcon, actionLabel, onActionClick, onFileClick,
}: {
  title: string; icon: React.ReactNode; files: { path: string; status: string }[];
  actionIcon?: React.ReactNode; actionLabel?: string; onActionClick?: (path: string) => void; onFileClick: (path: string) => void;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] uppercase tracking-wider text-fg-muted">
        {icon}
        {title}
        <span className="ml-1 opacity-50">({files.length})</span>
      </div>
      {files.map((f) => (
        <FileEntry
          key={f.path}
          file={f}
          actionIcon={actionIcon}
          actionLabel={actionLabel}
          onActionClick={onActionClick}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}

function FileEntry({
  file, actionIcon, actionLabel, onActionClick, onFileClick,
}: {
  file: { path: string; status: string };
  actionIcon?: React.ReactNode;
  actionLabel?: string;
  onActionClick?: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  const items: ContextMenuItem[] = [
    { id: "diff", label: "Open in Diff", icon: <FileText size={13} />, onSelect: () => onFileClick(file.path) },
    { id: "copy", label: "Copy Path", icon: <Copy size={13} />, onSelect: () => navigator.clipboard.writeText(file.path) },
    ...(onActionClick ? [{ id: "action", label: "Stage/Unstage", icon: actionIcon, onSelect: () => onActionClick(file.path) }] : []),
  ];

  return (
    <ContextMenu items={items} label={`Actions for ${file.path}`}>
      <div className="group flex items-center justify-between px-3 py-0.5 text-xs hover:bg-surface-elevated cursor-pointer">
        <div className="flex items-center gap-2 text-fg-secondary flex-1 truncate" onClick={() => onFileClick(file.path)}>
          <span className="font-mono text-[11px] text-fg-muted w-4 text-center">{file.status.trim() || "?"}</span>
          <span className="truncate">{file.path}</span>
        </div>
        {actionIcon && onActionClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onActionClick(file.path); }}
            aria-label={actionLabel}
            className="p-1 rounded text-fg-muted hover:text-fg-primary hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-fast"
          >
            {actionIcon}
          </button>
        )}
      </div>
    </ContextMenu>
  );
}
