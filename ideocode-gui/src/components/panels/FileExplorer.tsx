import { useEffect, useState } from "react";
import { useFileStore } from "../../stores/fileStore";
import { useGitStore } from "../../stores/gitStore";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  FolderInput,
  FileCode2,
  FileText,
  FileJson,
  FileCog,
  Image,
  Music,
  Film,
  Archive,
  Copy,
  Pencil,
  Trash2,
  Terminal,
  FolderPlus,
  FilePlus,
  CopyPlus,
  ArrowUpDown,
} from "lucide-react";
import { ContextMenu } from "../ui/ContextMenu";
import type { ContextMenuItem } from "../ui/ContextMenu";
import type { FileNode } from "../../lib/tauri-commands";

type GitFileStatus = {
  path: string;
  staged: boolean;
  indexStatus?: string;
  worktreeStatus?: string;
};

const GIT_STATUS_COLORS: Record<string, string> = {
  M: "text-amber-400",
  A: "text-success",
  D: "text-error",
  R: "text-purple-400",
  C: "text-cyan-400",
  "?": "text-gray-400",
};

function getGitStatusLetter(status?: string): string {
  if (!status || status === " ") return "";
  return status.charAt(0).toUpperCase();
}

const EXT_ICONS: Record<string, typeof File> = {
  ts: FileCode2, tsx: FileCode2, js: FileCode2, jsx: FileCode2, rs: FileCode2,
  py: FileCode2, go: FileCode2, java: FileCode2, cpp: FileCode2, c: FileCode2,
  rb: FileCode2, php: FileCode2, swift: FileCode2, kt: FileCode2,
  md: FileText, txt: FileText, doc: FileText, pdf: FileText,
  json: FileJson, yaml: FileJson, yml: FileJson, toml: FileJson, xml: FileJson,
  css: FileCog, scss: FileCog, less: FileCog, html: FileCog,
  png: Image, jpg: Image, jpeg: Image, gif: Image, svg: Image, ico: Image, webp: Image,
  mp3: Music, wav: Music, ogg: Music, flac: Music,
  mp4: Film, mkv: Film, avi: Film, mov: Film, webm: Film,
  zip: Archive, tar: Archive, gz: Archive, rar: Archive, "7z": Archive,
  sh: Terminal, bash: Terminal, zsh: Terminal, ps1: Terminal, bat: Terminal, cmd: Terminal,
};

function getFileIcon(name: string): typeof File {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_ICONS[ext] ?? File;
}

export function FileExplorer() {
  const { rootPath, tree, loading, error, expandedPaths, loadTree, toggleExpanded, openFile, activeFile, setRootPath } =
    useFileStore();
  const { status: gitStatus, loadStatus } = useGitStore();
  const [pathInput, setPathInput] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "type" | "size">("name");
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [creatingPath, setCreatingPath] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (rootPath) {
      loadStatus(rootPath);
    }
  }, [rootPath]);

  useEffect(() => {
    loadTree();
  }, [rootPath]);

  const sortTree = (nodes: FileNode[]): FileNode[] => {
    const sorted = [...nodes].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      if (sortBy === "size") return (a.size ?? 0) - (b.size ?? 0);
      if (sortBy === "type") {
        const extA = a.name.split(".").pop() ?? "";
        const extB = b.name.split(".").pop() ?? "";
        return extA.localeCompare(extB);
      }
      return a.name.localeCompare(b.name);
    });
    return sorted.map((n) => n.children ? { ...n, children: sortTree(n.children) } : n);
  };

  const gitStatusMap = new Map<string, GitFileStatus>();
  if (gitStatus) {
    for (const f of gitStatus.staged) {
      gitStatusMap.set(f.path, { path: f.path, staged: true, indexStatus: f.status });
    }
    for (const f of gitStatus.modified) {
      if (!gitStatusMap.has(f.path)) {
        gitStatusMap.set(f.path, { path: f.path, staged: false, worktreeStatus: f.status });
      }
    }
    for (const f of gitStatus.untracked) {
      gitStatusMap.set(f.path, { path: f.path, staged: false, worktreeStatus: "?" });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Files
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSortBy(sortBy === "name" ? "type" : sortBy === "type" ? "size" : "name")}
            className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
            title={`Sort by ${sortBy === "name" ? "type" : sortBy === "type" ? "size" : "name"}`}
          >
            <ArrowUpDown size={14} />
          </button>
          <button
            onClick={loadTree}
            className="p-1 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
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
          <div>
            {rootPath && (
              <ContextMenu
                items={[
                  { id: "new-file", label: "New File", icon: <FilePlus size={13} />, onSelect: () => { setCreating("file"); setCreatingPath(rootPath); } },
                  { id: "new-folder", label: "New Folder", icon: <FolderPlus size={13} />, onSelect: () => { setCreating("folder"); setCreatingPath(rootPath); } },
                  { id: "sep", label: "", separator: true },
                  { id: "copy-path", label: "Copy Path", icon: <Copy size={13} />, onSelect: () => navigator.clipboard.writeText(rootPath) },
                  { id: "open-terminal", label: "Open in Terminal", icon: <Terminal size={13} /> },
                  { id: "refresh", label: "Refresh", icon: <RefreshCw size={13} />, onSelect: loadTree },
                ]}
              >
                <div />
              </ContextMenu>
            )}
            {sortTree(tree).map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                expandedPaths={expandedPaths}
                activeFile={activeFile}
                onToggle={toggleExpanded}
                onSelect={openFile}
                sortBy={sortBy}
                creatingPath={creatingPath}
                creating={creating}
                setCreating={setCreating}
                setCreatingPath={setCreatingPath}
                renamingPath={renamingPath}
                setRenamingPath={setRenamingPath}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                gitStatusMap={gitStatusMap}
              />
            ))}
          </div>
        )}
      </div>

      {/* Root path */}
      {rootPath && (
        <div className="px-3 py-1.5 border-t border-border-subtle text-[11px] text-text-muted truncate">
          {rootPath}
        </div>
      )}
    </div>
  );
}

function TreeNode({
  node, depth, expandedPaths, activeFile, onToggle, onSelect, sortBy,
  creatingPath, creating, setCreating, setCreatingPath,
  renamingPath, setRenamingPath, renameValue, setRenameValue,
  gitStatusMap,
}: {
  node: FileNode; depth: number; expandedPaths: Set<string>; activeFile: string | null;
  onToggle: (path: string) => void; onSelect: (path: string) => void; sortBy: string;
  creatingPath: string; creating: "file" | "folder" | null;
  setCreating: (v: "file" | "folder" | null) => void; setCreatingPath: (p: string) => void;
  renamingPath: string | null; setRenamingPath: (p: string | null) => void;
  renameValue: string; setRenameValue: (v: string) => void;
  gitStatusMap: Map<string, GitFileStatus>;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = activeFile === node.path;
  const Icon = node.is_dir ? (isExpanded ? FolderOpen : Folder) : getFileIcon(node.name);
  const isCreatingHere = creating && creatingPath === node.path;

  const gitInfo = gitStatusMap.get(node.path);
  const gitLetter = gitInfo
    ? getGitStatusLetter(gitInfo.indexStatus || gitInfo.worktreeStatus)
    : "";
  const gitColor = gitLetter && GIT_STATUS_COLORS[gitLetter]
    ? GIT_STATUS_COLORS[gitLetter]
    : gitInfo?.staged
      ? "text-success"
      : "";

  const handleClick = () => {
    if (node.is_dir) onToggle(node.path);
    else onSelect(node.path);
  };

  const contextItems: ContextMenuItem[] = [
    ...(node.is_dir ? [
      { id: "new-file", label: "New File", icon: <FilePlus size={13} />, onSelect: () => { setCreating("file"); setCreatingPath(node.path); } },
      { id: "new-folder", label: "New Folder", icon: <FolderPlus size={13} />, onSelect: () => { setCreating("folder"); setCreatingPath(node.path); } },
      { id: "sep1", label: "", separator: true },
    ] : []),
    { id: "copy-path", label: "Copy Path", icon: <Copy size={13} />, onSelect: () => navigator.clipboard.writeText(node.path) },
    { id: "copy-name", label: "Copy Name", icon: <CopyPlus size={13} />, onSelect: () => navigator.clipboard.writeText(node.name) },
    { id: "rename", label: "Rename", icon: <Pencil size={13} />, onSelect: () => { setRenamingPath(node.path); setRenameValue(node.name); } },
    { id: "sep2", label: "", separator: true },
    { id: "delete", label: "Delete", icon: <Trash2 size={13} />, danger: true },
  ];

  const sortChildren = (children: FileNode[]): FileNode[] => {
    const sorted = [...children].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      if (sortBy === "size") return (a.size ?? 0) - (b.size ?? 0);
      if (sortBy === "type") {
        const extA = a.name.split(".").pop() ?? "";
        const extB = b.name.split(".").pop() ?? "";
        return extA.localeCompare(extB);
      }
      return a.name.localeCompare(b.name);
    });
    return sorted.map((n) => n.children ? { ...n, children: sortChildren(n.children) } : n);
  };

  return (
    <div>
      <ContextMenu items={contextItems} label={`Actions for ${node.name}`}>
        <div>
          {renamingPath === node.path ? (
            <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
              <Icon size={14} className={`shrink-0 ${node.is_dir ? "text-accent-primary" : "text-text-muted"}`} />
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameValue.trim()) { setRenamingPath(null); }
                  if (e.key === "Escape") setRenamingPath(null);
                }}
                onBlur={() => setRenamingPath(null)}
                className="flex-1 bg-bg-primary text-text-primary text-xs px-1 py-0.5 rounded border border-accent-primary outline-none"
              />
            </div>
          ) : (
            <button
              onClick={handleClick}
              className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-xs hover:bg-bg-elevated transition-fast text-left
                ${isSelected ? "bg-bg-elevated text-accent-primary" : "text-text-secondary"}`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {node.is_dir ? (
                isExpanded ? <ChevronDown size={12} className="shrink-0 text-text-muted" /> : <ChevronRight size={12} className="shrink-0 text-text-muted" />
              ) : (
                <span className="w-3" />
              )}
              <Icon size={14} className={`shrink-0 ${node.is_dir ? "text-accent-primary" : "text-text-muted"}`} />
              <span className="truncate">{node.name}</span>
              {gitLetter && (
                <span className={`ml-1 text-[10px] font-mono font-bold ${gitColor}`}>{gitLetter}</span>
              )}
              {!node.is_dir && node.size !== undefined && (
                <span className="ml-auto text-[11px] text-text-muted">{formatSize(node.size)}</span>
              )}
            </button>
          )}
        </div>
      </ContextMenu>

      {/* New file/folder creation */}
      {isCreatingHere && (
        <NewEntryForm
          type={creating!}
          parentPath={node.path}
          depth={depth + 1}
          onDone={() => { setCreating(null); setCreatingPath(""); }}
        />
      )}

      {/* Children */}
      {node.is_dir && isExpanded && node.children && (
        <div>
          {sortChildren(node.children).map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              activeFile={activeFile}
              onToggle={onToggle}
              onSelect={onSelect}
              sortBy={sortBy}
              creatingPath={creatingPath}
              creating={creating}
              setCreating={setCreating}
              setCreatingPath={setCreatingPath}
              renamingPath={renamingPath}
              setRenamingPath={setRenamingPath}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              gitStatusMap={gitStatusMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewEntryForm({ type, depth, onDone }: { type: "file" | "folder"; parentPath: string; depth: number; onDone: () => void }) {
  const [name, setName] = useState("");
  const Icon = type === "file" ? FilePlus : FolderPlus;

  return (
    <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
      <Icon size={14} className="shrink-0 text-accent-primary" />
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) { onDone(); }
          if (e.key === "Escape") onDone();
        }}
        onBlur={() => onDone()}
        placeholder={`${type} name`}
        className="flex-1 bg-bg-primary text-text-primary text-xs px-1 py-0.5 rounded border border-accent-primary outline-none placeholder:text-text-muted"
      />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
