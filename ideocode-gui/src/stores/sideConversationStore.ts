import { create } from "zustand";
import type { Message } from "../lib/tauri-commands";

export interface SideConversationTab {
  id: string;
  title: string;
  created: number;
  messages: Message[];
}

interface SideConversationState {
  tabs: SideConversationTab[];
  activeTabId: string | null;
  addTab: (title?: string, messages?: Message[]) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;
  setTabMessages: (id: string, messages: Message[]) => void;
  getTabMessages: (id: string) => Message[];
  hasTabs: () => boolean;
}

let counter = 0;

export const useSideConversationStore = create<SideConversationState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (title?: string, messages?: Message[]) => {
    counter += 1;
    const id = `side-${Date.now()}-${counter}`;
    const tab: SideConversationTab = {
      id,
      title: title ?? `Tab ${get().tabs.length + 1}`,
      created: Date.now(),
      messages: messages ?? [],
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

  setTabMessages: (id, messages) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, messages } : t)),
    }));
  },

  getTabMessages: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    return tab ? tab.messages : [];
  },

  hasTabs: () => get().tabs.length > 0,
}));
