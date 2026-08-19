import { create } from "zustand";

export interface SideConversationTab {
  id: string;
  title: string;
  created: number;
}

interface SideConversationState {
  tabs: SideConversationTab[];
  activeTabId: string | null;
  addTab: (title?: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;
}

let counter = 0;

export const useSideConversationStore = create<SideConversationState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (title?: string) => {
    counter += 1;
    const id = `side-${Date.now()}-${counter}`;
    const tab: SideConversationTab = {
      id,
      title: title ?? `Tab ${get().tabs.length + 1}`,
      created: Date.now(),
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
    return id;
  },

  removeTab: (id) => {
    set((s) => {
      const remaining = s.tabs.filter((t) => t.id !== id);
      const activeId =
        s.activeTabId === id
          ? (remaining[remaining.length - 1]?.id ?? null)
          : s.activeTabId;
      return { tabs: remaining, activeTabId: activeId };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  renameTab: (id, title) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    }));
  },
}));
