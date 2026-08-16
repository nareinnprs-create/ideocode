import { useAppStore } from "../../stores/appStore";
import { Sparkles, X, Minimize2, Maximize2, Send, Paperclip } from "lucide-react";
import { useState } from "react";
import { Composer } from "./Composer";

export function ComposerPane() {
  const { composerOpen, setComposerOpen } = useAppStore();
  const [fullscreen, setFullscreen] = useState(false);

  if (!composerOpen) return null;

  return (
    <div
      className={`absolute z-40 bg-bg-primary border border-border-strong rounded-xl shadow-modal flex flex-col overflow-hidden transition-all duration-200 ${
        fullscreen
          ? "inset-4"
          : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-secondary select-none" data-tauri-drag-region>
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
      
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        <div className="flex-1 border border-border-subtle rounded-lg bg-bg-secondary mb-4 p-4 text-text-muted flex items-center justify-center">
          Multi-file workspace context goes here...
        </div>
        <Composer />
      </div>
    </div>
  );
}
