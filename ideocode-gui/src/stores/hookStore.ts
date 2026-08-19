import { create } from "zustand";

export type HookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PermissionRequest"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "Stop";

export interface HookMatcher {
  type: "exact" | "regex" | "wildcard";
  patterns: string[];
}

export interface Hook {
  id: string;
  name: string;
  event: HookEvent;
  matcher: HookMatcher;
  command: string;
  enabled: boolean;
  async: boolean;
  timeout: number;
}

interface HookState {
  hooks: Hook[];
}

interface HookActions {
  add: (hook: Omit<Hook, "id">) => Hook;
  update: (id: string, updates: Partial<Omit<Hook, "id">>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  getForEvent: (event: HookEvent) => Hook[];
}

export type HookStore = HookState & HookActions;

const STORAGE_KEY = "idc-hooks-v2";

function loadState(): HookState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hooks: (parsed.hooks ?? []) as Hook[],
      };
    }
  } catch {}
  return { hooks: [] };
}

function saveState(state: HookState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `hook-${Date.now()}-${idCounter}`;
}

export const useHookStore = create<HookStore>((set, get) => ({
  ...loadState(),

  add: (hook) => {
    const newHook: Hook = {
      ...hook,
      id: makeId(),
    };
    const hooks = [...get().hooks, newHook];
    set({ hooks });
    saveState({ hooks });
    return newHook;
  },

  update: (id, updates) => {
    const hooks = get().hooks.map((h) =>
      h.id === id ? { ...h, ...updates } : h,
    );
    set({ hooks });
    saveState({ hooks });
  },

  remove: (id) => {
    const hooks = get().hooks.filter((h) => h.id !== id);
    set({ hooks });
    saveState({ hooks });
  },

  toggle: (id) => {
    const hooks = get().hooks.map((h) =>
      h.id === id ? { ...h, enabled: !h.enabled } : h,
    );
    set({ hooks });
    saveState({ hooks });
  },

  getForEvent: (event) => get().hooks.filter((h) => h.event === event && h.enabled),
}));
