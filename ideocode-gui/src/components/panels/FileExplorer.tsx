import { useEffect, useState } from "react";
import { useFileStore } from "../../stores/fileStore";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  FolderInput,
} from "lucide-react";
import type { FileNode } from "../../lib/tauri-commands";

export function FileExplorer() {
  const { rootPath, tree, loading, error, expandedPaths, loadTree, toggleExpanded, openFile, activeFile, setRootPath } =
    useFileStore();
  const [pathInput, setPathInput] = useState("");

  useEffect(() => {
    loadTree();
  }, [rootPath]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Files
        </span>
        <button
          onClick={loadTree}
          className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 p-2 rounded bg-error/10 border border-error/30">
          <div className="text-xs text-error">{error}</div>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {!rootPath ? (
          <div className="px-3 py-4">
            <div className="text-xs text-text-muted mb-2">Enter a project path to browse:</div>
            <div className="flex gap-1">
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && pathInput.trim() && setRootPath(pathInput.trim())}
                placeholder="C:\path\to\project"
                className="flex-1 bg-bg-primary text-text-primary text-xs px-2 py-1.5 rounded border border-border-subtle placeholder:text-text-muted outline-none focus:border-accent-primary"
              />
              <button
                onClick={() => pathInput.trim() && setRootPath(pathInput.trim())}
                disabled={!pathInput.trim()}
                className="px-2 py-1.5 rounded bg-accent-primary text-white text-xs hover:bg-accent-hover disabled:opacity-50 transition-fast"
              >
                <FolderInput size={14} />
              </button>
            </div>
          </div>
        ) : tree.length === 0 && !loading ? (
          <div className="px-3 py-4 text-center text-text-muted text-xs">
            No files found in {rootPath}
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedPaths={expandedPaths}
              activeFile={activeFile}
              onToggle={toggleExpanded}
              onSelect={openFile}
            />
          ))
        )}
      </div>

      {/* Root path */}
      {rootPath && (
        <div className="px-3 py-1.5 border-t border-border-subtle text-[10px] text-text-muted truncate">
          {rootPath}
        </div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expandedPaths,
  activeFile,
  onToggle,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  expandedPaths: Set<string>;
  activeFile: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = activeFile === node.path;

  const handleClick = () => {
    if (node.is_dir) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const Icon = node.is_dir
    ? isExpanded
      ? FolderOpen
      : Folder
    : File;

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-xs hover:bg-bg-elevated transition-fast text-left
          ${isSelected ? "bg-bg-elevated text-accent-primary" : "text-text-secondary"}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.is_dir ? (
          isExpanded ? (
            <ChevronDown size={12} className="shrink-0 text-text-muted" />
          ) : (
            <ChevronRight size={12} className="shrink-0 text-text-muted" />
          )
        ) : (
          <span className="w-3" />
        )}
        <Icon
          size={14}
          className={`shrink-0 ${node.is_dir ? "text-accent-primary" : "text-text-muted"}`}
        />
        <span className="truncate">{node.name}</span>
        {!node.is_dir && node.size !== undefined && (
          <span className="ml-auto text-[10px] text-text-muted">
            {formatSize(node.size)}
          </span>
        )}
      </button>

      {/* Children */}
      {node.is_dir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              activeFile={activeFile}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
