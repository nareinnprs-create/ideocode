import { useState, useRef, useEffect } from "react";
import { Plus, X, MessageSquare } from "lucide-react";
import { useSideConversationStore } from "../../stores/sideConversationStore";

export function ComposerTabs() {
  const tabs = useSideConversationStore((s) => s.tabs);
  const activeTabId = useSideConversationStore((s) => s.activeTabId);
  const addTab = useSideConversationStore((s) => s.addTab);
  const removeTab = useSideConversationStore((s) => s.removeTab);
  const setActiveTab = useSideConversationStore((s) => s.setActiveTab);
  const renameTab = useSideConversationStore((s) => s.renameTab);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle);
  };

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      renameTab(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    removeTab(id);
  };

  if (tabs.length === 0) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border-subtle">
        <button
          onClick={() => addTab("Chat 1")}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-fg-muted hover:text-fg-primary hover:bg-surface-hover rounded-md transition-fast"
        >
          <Plus size={12} />
          <span>New Chat</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1 border-b border-border-subtle scrollbar-none bg-surface/30">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          onDoubleClick={() => startRename(tab.id, tab.title)}
          className={`group flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-150 shrink-0 ${
            activeTabId === tab.id
              ? "bg-accent/10 text-accent border border-accent/20"
              : "text-fg-muted hover:text-fg-secondary hover:bg-surface-hover border border-transparent"
          }`}
        >
          <MessageSquare size={11} className="shrink-0" />
          {editingId === tab.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingId(null);
              }}
              className="bg-transparent border-b border-accent text-[11px] font-medium text-fg-primary outline-none w-20"
            />
          ) : (
            <span className="truncate max-w-[90px]">{tab.title}</span>
          )}
          {tabs.length > 1 && (
            <button
              onClick={(e) => handleClose(e, tab.id)}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-all"
              aria-label={`Close ${tab.title}`}
            >
              <X size={10} />
            </button>
          )}
        </button>
      ))}
      <button
        onClick={() => addTab()}
        className="ml-1 p-1 text-fg-muted hover:text-fg-primary rounded hover:bg-surface-hover transition-fast shrink-0"
        title="New conversation tab (Ctrl+T)"
        aria-label="New chat tab"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
