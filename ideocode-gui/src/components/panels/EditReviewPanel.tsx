import { useState } from "react";
import {
  Check,
  X,
  FileEdit as FileEditIcon,
  RotateCcw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useEditStore, type FileEdit } from "../../stores/editStore";

function MiniDiff({ edit }: { edit: FileEdit }) {
  const originalLines = edit.original.split("\n");
  const modifiedLines = edit.modified.split("\n");

  const maxLen = Math.max(originalLines.length, modifiedLines.length);
  const lines: { left: string; right: string; type: "same" | "removed" | "added" }[] = [];
  for (let i = 0; i < maxLen; i++) {
    const left = originalLines[i] ?? "";
    const right = modifiedLines[i] ?? "";
    lines.push({
      left,
      right,
      type: left === right ? "same" : left === "" ? "added" : right === "" ? "removed" : "added",
    });
  }

  return (
    <div className="flex border border-border-subtle rounded text-[11px] font-mono overflow-hidden max-h-40 overflow-y-auto">
      <div className="flex-1 min-w-0 border-r border-border-subtle">
        {lines.map((l, i) => (
          <div
            key={`o-${i}`}
            className={`px-2 py-0.5 whitespace-pre overflow-hidden text-ellipsis ${
              l.type === "removed"
                ? "bg-red-500/15 text-red-400"
                : l.type === "added"
                  ? "bg-green-500/15 text-green-400"
                  : "text-text-muted"
            }`}
          >
            {l.left}
          </div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        {lines.map((l, i) => (
          <div
            key={`m-${i}`}
            className={`px-2 py-0.5 whitespace-pre overflow-hidden text-ellipsis ${
              l.type === "added"
                ? "bg-green-500/15 text-green-400"
                : l.type === "removed"
                  ? "bg-red-500/15 text-red-400"
                  : "text-text-muted"
            }`}
          >
            {l.right}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditCard({ edit }: { edit: FileEdit }) {
  const acceptEdit = useEditStore((s) => s.acceptEdit);
  const rejectEdit = useEditStore((s) => s.rejectEdit);
  const [expanded, setExpanded] = useState(false);

  const fileName = edit.path.split(/[/\\]/).pop() ?? edit.path;

  return (
    <div className="border border-border-subtle rounded-md bg-bg-secondary overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-text-muted hover:text-text-primary shrink-0"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        <FileEditIcon className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="text-[11px] font-mono text-text-primary truncate flex-1">
          {fileName}
        </span>
        <span className="text-[10px] text-text-muted truncate max-w-[200px]">
          {edit.path}
        </span>
        {edit.status === "pending" && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => acceptEdit(edit.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 text-[11px]"
            >
              <Check className="w-3 h-3" /> Accept
            </button>
            <button
              onClick={() => rejectEdit(edit.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 text-[11px]"
            >
              <X className="w-3 h-3" /> Reject
            </button>
          </div>
        )}
        {edit.status === "accepted" && (
          <span className="text-[10px] text-green-400 shrink-0">Applied</span>
        )}
        {edit.status === "rejected" && (
          <span className="text-[10px] text-red-400 shrink-0">Rejected</span>
        )}
      </div>
      {expanded && (
        <div className="px-3 pb-3">
          <MiniDiff edit={edit} />
        </div>
      )}
    </div>
  );
}

export function EditReviewPanel() {
  const edits = useEditStore((s) => s.edits);
  const acceptAll = useEditStore((s) => s.acceptAll);
  const rejectAll = useEditStore((s) => s.rejectAll);
  const clearEdits = useEditStore((s) => s.clearEdits);
  const pending = edits.filter((e) => e.status === "pending");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border-subtle bg-bg-secondary shrink-0">
        <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-primary">
          Edit Review
        </span>
        {pending.length > 0 && (
          <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
            {pending.length} pending
          </span>
        )}
        <div className="flex-1" />
        {pending.length > 0 && (
          <>
            <button
              onClick={acceptAll}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25 text-[11px]"
            >
              <Check className="w-3 h-3" /> Accept All
            </button>
            <button
              onClick={rejectAll}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 text-[11px]"
            >
              <X className="w-3 h-3" /> Reject All
            </button>
          </>
        )}
        {edits.length > 0 && (
          <button
            onClick={clearEdits}
            className="text-[10px] text-text-muted hover:text-text-primary"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
        {edits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <FileEditIcon className="w-8 h-8 opacity-30" />
            <span className="text-xs">No edits to review</span>
          </div>
        ) : (
          edits.map((edit) => <EditCard key={edit.id} edit={edit} />)
        )}
      </div>
    </div>
  );
}
