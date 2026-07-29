import { useEffect } from "react";
import { useFileStore } from "../../stores/fileStore";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import type { FileNode } from "../../lib/tauri-commands";

export function FileExplorer() {
  const { rootPath, tree, loading, expandedPaths, loadTree, toggleExpanded, selectFile, selectedFile } =
    useFileStore();

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

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            expandedPaths={expandedPaths}
            selectedFile={selectedFile}
            onToggle={toggleExpanded}
            onSelect={selectFile}
          />
        ))}
      </div>

      {/* Root path */}
      <div className="px-3 py-1.5 border-t border-border-subtle text-[10px] text-text-muted truncate">
        {rootPath}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expandedPaths,
  selectedFile,
  onToggle,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedFile: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedFile === node.path;

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
              selectedFile={selectedFile}
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
