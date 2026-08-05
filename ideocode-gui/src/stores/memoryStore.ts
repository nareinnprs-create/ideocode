import { create } from "zustand";
import {
  listMemories as tauriListMemories,
  storeMemory as tauriStoreMemory,
  searchMemories as tauriSearchMemories,
  deleteMemory as tauriDeleteMemory,
  type MemoryEntry,
} from "../lib/tauri-commands";
import { notify } from "./toastStore";

interface MemoryState {
  entries: MemoryEntry[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  loadMemories: () => Promise<void>;
  searchMemories: (query: string) => Promise<void>;
  storeMemory: (content: string, tags: string[], category: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  searchQuery: "",

  loadMemories: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await tauriListMemories();
      set({ entries, loading: false });
    } catch (e) {
      set({ loading: false, error: `Failed to load memories: ${e}` });
    }
  },

  searchMemories: async (query: string) => {
    set({ loading: true, error: null, searchQuery: query });
    try {
      const entries = await tauriSearchMemories(query);
      set({ entries, loading: false });
    } catch (e) {
      set({ loading: false, error: `Search failed: ${e}` });
    }
  },

  storeMemory: async (content: string, tags: string[], category: string) => {
    try {
      await tauriStoreMemory(content, tags, category);
      await get().loadMemories();
      notify("success", "Memory saved");
    } catch (e) {
      set({ error: `Failed to store memory: ${e}` });
      notify("error", "Failed to store memory", `${e}`);
    }
  },

  deleteMemory: async (id: string) => {
    try {
      await tauriDeleteMemory(id);
      set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
    } catch (e) {
      set({ error: `Failed to delete memory: ${e}` });
      notify("error", "Failed to delete memory", `${e}`);
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
}));
