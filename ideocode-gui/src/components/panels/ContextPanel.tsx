import { useState } from "react";
import { FileText, X, Pin, PinOff, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useContextStore } from "../../stores/contextStore";
import { useFileStore } from "../../stores/fileStore";
import { useEditStore } from "../../stores/editStore";

export function ContextPanel() {
  const files = useContextStore((s) => s.files);
  const autoInclude = useContextStore((s) => s.autoInclude);
  const removeFile = useContextStore((s) => s.removeFile);
  const togglePinned = useContextStore((s) => s.togglePinned);
  const clearUnpinned = useContextStore((s) => s.clearUnpinned);
  const setAutoInclude = useContextStore((s) => s.setAutoInclude);
  const addFile = useContextStore((s) => s.addFile);
  const rootPath = useFileStore((s) => s.rootPath);
  const edits = useEditStore((s) => s.edits);
  const [newPath, setNewPath] = useState("");

  const pendingEdits = edits.filter((e) => e.status === "pending");

  const handleAdd = () => {
    if (!newPath.trim()) return;
    const fullPath = rootPath && !newPath.startsWith("/") && !/^[a-zA-Z]:/.test(newPath)
      ? `${rootPath}/${newPath.trim()}`
      : newPath.trim();
    addFile(fullPath);
    setNewPath("");
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Context panel">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-accent" />
          <span className="text-[12px] font-medium text-fg-primary">Context ({files.length} files)</span>
        </div>
        <button
          onClick={() => setAutoInclude(!autoInclude)}
          className="flex items-center gap-1 text-[11px] text-fg-secondary hover:text-fg-primary transition-fast"
          title={autoInclude ? "Auto-include project files" : "Manual context only"}
        >
          {autoInclude ? <ToggleRight size={14} className="text-accent" /> : <ToggleLeft size={14} />}
          Auto
        </button>
      </div>

      {/* Pending edits banner */}
      {pendingEdits.length > 0 && (
        <div className="px-3 py-2 bg-warning-muted border-b border-border-subtle text-[11px] text-warning">
          {pendingEdits.length} pending edit{pendingEdits.length !== 1 ? "s" : ""} in workspace
        </div>
      )}

      {/* Add file input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <input
          type="text"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add file to context..."
          className="flex-1 bg-surface-elevated px-2 py-1 rounded text-[12px] text-fg-primary border border-border-subtle placeholder:text-fg-muted focus:outline-none focus:border-accent"
        />
        <button
          onClick={handleAdd}
          disabled={!newPath.trim()}
          className="p-1 rounded text-accent hover:bg-accent/10 disabled:opacity-30 transition-fast"
          title="Add file"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-fg-muted text-xs p-6 text-center gap-2">
            <FileText size={20} className="text-fg-muted/50" />
            <span>No context files loaded</span>
            <span className="text-[10px] text-fg-muted/60">Files will be auto-included when a workspace is open</span>
          </div>
        )}
        {files.map((f) => (
          <div
            key={f.path}
            className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle hover:bg-surface-hover group transition-fast"
          >
            <FileText size={12} className="text-fg-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-fg-primary truncate" title={f.path}>
                {f.path.split(/[/\\]/).pop()}
              </div>
              <div className="text-[10px] text-fg-muted truncate" title={f.path}>
                {f.path}
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-fast">
              <button
                onClick={() => togglePinned(f.path)}
                className="p-1 rounded text-fg-muted hover:text-accent transition-fast"
                title={f.pinned ? "Unpin" : "Pin"}
              >
                {f.pinned ? <Pin size={11} /> : <PinOff size={11} />}
              </button>
              <button
                onClick={() => removeFile(f.path)}
                className="p-1 rounded text-fg-muted hover:text-error transition-fast"
                title="Remove from context"
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle">
          <span className="text-[10px] text-fg-muted">
            {files.filter((f) => f.pinned).length} pinned
          </span>
          <button
            onClick={clearUnpinned}
            className="flex items-center gap-1 text-[10px] text-fg-muted hover:text-error transition-fast"
          >
            <Trash2 size={10} />
            Clear unpinned
          </button>
        </div>
      )}
    </div>
  );
}
