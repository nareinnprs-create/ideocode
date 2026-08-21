import { Plus, X } from "lucide-react";
import { useSideConversationStore } from "../../stores/sideConversationStore";

export function SideConversationTabs() {
  const tabs = useSideConversationStore((s) => s.tabs);
  const activeTabId = useSideConversationStore((s) => s.activeTabId);
  const addTab = useSideConversationStore((s) => s.addTab);
  const removeTab = useSideConversationStore((s) => s.removeTab);
  const setActiveTab = useSideConversationStore((s) => s.setActiveTab);

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1 border-b border-border-subtle scrollbar-none bg-surface/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`group flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 shrink-0 ${
            activeTabId === tab.id
              ? "bg-accent/10 text-accent border border-accent/25"
              : "text-fg-muted hover:text-fg-secondary hover:bg-surface-hover border border-transparent"
          }`}
        >
          <span className="truncate max-w-[100px]">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTab(tab.id);
            }}
            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error transition-all"
          >
            <X size={10} />
          </button>
        </button>
      ))}
      <button
        onClick={() => addTab()}
        className="ml-1 p-1 text-fg-muted hover:text-fg-primary rounded hover:bg-surface-hover transition-fast shrink-0"
        title="New conversation tab"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
