import { useAppStore } from "../../stores/appStore";
import { Sparkles, X, Minimize2, Maximize2, Check, FileEdit } from "lucide-react";
import { useState } from "react";
import { Composer } from "./Composer";
import { useEditStore } from "../../stores/editStore";
import { DiffViewer } from "../editor/DiffViewer";
import { IconButton } from "../ui/IconButton";

export function ComposerPane() {
  const { composerOpen, setComposerOpen } = useAppStore();
  const [fullscreen, setFullscreen] = useState(false);
  const edits = useEditStore((s) => s.edits);
  const acceptEdit = useEditStore((s) => s.acceptEdit);
  const rejectEdit = useEditStore((s) => s.rejectEdit);
  const acceptAll = useEditStore((s) => s.acceptAll);
  const rejectAll = useEditStore((s) => s.rejectAll);
  
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);

  if (!composerOpen) return null;

  const pendingCount = edits.filter((e) => e.status === "pending").length;
  const hasEdits = edits.length > 0;
  const selectedEdit = edits.find((e) => e.id === selectedEditId) || edits[0];

  return (
    <div
      className={`absolute z-40 bg-bg-primary/95 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-modal flex flex-col overflow-hidden transition-all duration-300 ease-spring ${
        fullscreen
          ? "inset-4"
          : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[650px]"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-transparent select-none" data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-primary" />
          <span className="font-semibold text-text-primary text-sm">Composer</span>
          <span className="text-xs text-text-muted ml-2">Cmd+I</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1 rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => setComposerOpen(false)}
            className="p-1 rounded-md text-text-muted hover:bg-bg-hover hover:text-error transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`${hasEdits ? "w-[350px] border-r border-white/5 flex flex-col" : "w-full flex flex-col"} transition-all duration-300 p-4`}>
          <Composer />
        </div>

        {hasEdits && (
          <div className="flex-1 flex flex-col bg-transparent">
            <div className="p-3 border-b border-white/5 bg-transparent flex items-center justify-between">
              <span className="text-[13px] font-medium text-text-primary flex items-center gap-2">
                <FileEdit size={14} className="text-accent-primary" />
                Workspace Edits
              </span>
              {pendingCount > 0 && (
                <div className="flex items-center gap-2">
                  <button onClick={rejectAll} className="text-[11px] px-2 py-1 rounded border border-border-subtle hover:bg-bg-hover text-text-secondary transition-colors">
                    Reject All
                  </button>
                  <button onClick={acceptAll} className="text-[11px] px-2 py-1 rounded bg-accent-primary text-white hover:bg-accent-hover transition-colors font-medium flex items-center gap-1">
                    <Check size={12} /> Accept All ({pendingCount})
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-[200px] border-r border-white/5 overflow-y-auto p-2 space-y-1">
                {edits.map((edit) => (
                  <button
                    key={edit.id}
                    onClick={() => setSelectedEditId(edit.id)}
                    className={`w-full flex flex-col text-left p-2 rounded-md transition-colors border ${
                      selectedEdit?.id === edit.id ? "bg-white/10 border-white/5" : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-text-primary truncate" title={edit.path}>
                        {edit.path.split(/[/\\]/).pop()}
                      </span>
                      {edit.status === "pending" && (
                        <div className="flex items-center gap-0.5">
                          <IconButton size="sm" onClick={(e) => { e.stopPropagation(); acceptEdit(edit.id); }} className="text-success hover:bg-success/20" label="Accept">
                            <Check size={12} />
                          </IconButton>
                          <IconButton size="sm" onClick={(e) => { e.stopPropagation(); rejectEdit(edit.id); }} className="text-error hover:bg-error/20" label="Reject">
                            <X size={12} />
                          </IconButton>
                        </div>
                      )}
                    </div>
                    {edit.status !== "pending" && (
                      <span className={`text-[10px] uppercase font-bold mt-1 ${edit.status === "accepted" ? "text-success" : "text-error"}`}>
                        {edit.status}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
                {selectedEdit ? (
                  <>
                    <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2 bg-bg-tertiary/50">
                      <span className="text-[11px] text-text-muted font-mono">{selectedEdit.path}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <DiffViewer 
                        file={selectedEdit.path} 
                        originalContent={selectedEdit.original} 
                        modifiedContent={selectedEdit.modified} 
                        height="100%" 
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
                    Select an edit to view diff
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
