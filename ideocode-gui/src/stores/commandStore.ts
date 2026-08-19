import { create } from "zustand";

export interface Command {
  id: string;
  name: string;
  description: string;
  prompt: string;
  scope: "user" | "workspace";
  createdAt: number;
  updatedAt: number;
}

interface CommandState {
  commands: Command[];
}

interface CommandActions {
  add: (name: string, description: string, prompt: string, scope: Command["scope"]) => Command;
  update: (id: string, updates: Partial<Omit<Command, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  list: () => Command[];
  getByName: (name: string) => Command | null;
  resolve: (text: string) => { command: Command | null; args: string };
}

export type CommandStore = CommandState & CommandActions;

const STORAGE_KEY = "idc-prompt-commands";

function loadState(): CommandState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        commands: (parsed.commands ?? []) as Command[],
      };
    }
  } catch {}
  return { commands: [] };
}

function saveState(state: CommandState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `cmd-${Date.now()}-${idCounter}`;
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  ...loadState(),

  add: (name, description, prompt, scope) => {
    const now = Date.now();
    const command: Command = {
      id: makeId(),
      name: name.slice(0, 64),
      description,
      prompt,
      scope,
      createdAt: now,
      updatedAt: now,
    };
    const commands = [...get().commands, command];
    set({ commands });
    saveState({ commands });
    return command;
  },

  update: (id, updates) => {
    const commands = get().commands.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c,
    );
    set({ commands });
    saveState({ commands });
  },

  remove: (id) => {
    const commands = get().commands.filter((c) => c.id !== id);
    set({ commands });
    saveState({ commands });
  },

  list: () => get().commands,

  getByName: (name) => get().commands.find((c) => c.name === name) ?? null,

  resolve: (text) => {
    const trimmed = text.trim();
    if (!trimmed.startsWith("/")) return { command: null, args: trimmed };
    const spaceIdx = trimmed.indexOf(" ");
    const name = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx);
    const args = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
    const command = get().commands.find((c) => c.name === name) ?? null;
    return { command, args };
  },
}));
