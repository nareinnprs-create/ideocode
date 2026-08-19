import { create } from "zustand";

export interface TerminalInstance {
  id: string;
  name: string;
  created: number;
}

interface TerminalState {
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
  addTerminal: () => string;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;
  renameTerminal: (id: string, name: string) => void;
}

let nextId = 1;

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  activeTerminalId: null,

  addTerminal: () => {
    const id = `term-${nextId++}`;
    const instance: TerminalInstance = {
      id,
      name: `Terminal ${get().terminals.length + 1}`,
      created: Date.now(),
    };
    set((s) => ({
      terminals: [...s.terminals, instance],
      activeTerminalId: id,
    }));
    return id;
  },

  removeTerminal: (id) => {
    set((s) => {
      const remaining = s.terminals.filter((t) => t.id !== id);
      const activeId = s.activeTerminalId === id
        ? (remaining[remaining.length - 1]?.id ?? null)
        : s.activeTerminalId;
      return { terminals: remaining, activeTerminalId: activeId };
    });
  },

  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  renameTerminal: (id, name) => {
    set((s) => ({
      terminals: s.terminals.map((t) =>
        t.id === id ? { ...t, name } : t,
      ),
    }));
  },
}));
