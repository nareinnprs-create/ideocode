import { create } from "zustand";
import type { Message } from "../lib/tauri-commands";
import { saveSideSession, loadSideSession } from "../lib/tauri-commands";

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
  init: () => Promise<void>;
}

let counter = 0;

function persistTab(tab: SideConversationTab) {
  if (!/^side-/.test(tab.id)) {
    return;
  }
  void saveSideSession(tab.id, tab.title, tab.messages).catch(() => {
    // best-effort persistence; failures don't break the in-memory tabs
  });
}

export const useSideConversationStore = create<SideConversationState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  init: async () => {
    try {
      const { listSessions } = await import("../lib/tauri-commands");
      const sessions = await listSessions();
      const sideIds = sessions
        .filter((s) => (s as { side?: boolean }).side)
        .map((s) => s.id);
      if (sideIds.length === 0) return;
      const loaded: SideConversationTab[] = [];
      for (const id of sideIds) {
        try {
          const [title, messages] = await loadSideSession(id);
          if (messages.length > 0) {
            loaded.push({ id, title, created: Date.now() - 1000, messages });
          }
        } catch {
          // skip unreadable side session
        }
      }
      if (loaded.length > 0) {
        set((s) => ({
          tabs: [...s.tabs, ...loaded],
          activeTabId: s.activeTabId ?? loaded[loaded.length - 1]?.id ?? null,
        }));
      }
    } catch {
      // no persistence backend available
    }
  },

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
    persistTab(tab);
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
    void import("../lib/tauri-commands").then(({ deleteSession }) =>
      deleteSession(id).catch(() => {
        // ignore removal failure
      }),
    );
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  renameTab: (id, title) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    }));
    const tab = get().tabs.find((t) => t.id === id);
    if (tab) persistTab({ ...tab, title });
  },

  setTabMessages: (id, messages) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, messages } : t)),
    }));
    const tab = get().tabs.find((t) => t.id === id);
    if (tab) persistTab({ ...tab, messages });
  },

  getTabMessages: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    return tab ? tab.messages : [];
  },

  hasTabs: () => get().tabs.length > 0,
}));
