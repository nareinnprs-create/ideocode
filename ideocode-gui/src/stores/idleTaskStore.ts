import { create } from "zustand";

export type IdleTaskStatus =
  | "queued"
  | "paused"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface IdleTask {
  id: string;
  title: string;
  prompt: string;
  status: IdleTaskStatus;
  model?: string;
  progress?: string;
  result?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

interface IdleTaskState {
  queue: IdleTask[];
  maxConcurrent: number;
}

interface IdleTaskActions {
  enqueue: (title: string, prompt: string, model?: string) => IdleTask;
  cancel: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  remove: (id: string) => void;
  getQueue: () => IdleTask[];
  getRunning: () => IdleTask | null;
}

export type IdleTaskStore = IdleTaskState & IdleTaskActions;

const STORAGE_KEY = "idc-idle-tasks";

function loadState(): IdleTaskState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        queue: (parsed.queue ?? []) as IdleTask[],
        maxConcurrent: (parsed.maxConcurrent as number) ?? 1,
      };
    }
  } catch {}
  return { queue: [], maxConcurrent: 1 };
}

function saveState(state: IdleTaskState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `idle-${Date.now()}-${idCounter}`;
}

export const useIdleTaskStore = create<IdleTaskStore>((set, get) => ({
  ...loadState(),

  enqueue: (title, prompt, model) => {
    const task: IdleTask = {
      id: makeId(),
      title,
      prompt,
      status: "queued",
      model,
      createdAt: Date.now(),
    };
    const queue = [...get().queue, task];
    set({ queue });
    saveState({ ...get(), queue });
    return task;
  },

  cancel: (id) => {
    const queue = get().queue.map((t) =>
      t.id === id && (t.status === "queued" || t.status === "paused" || t.status === "running")
        ? { ...t, status: "cancelled" as IdleTaskStatus }
        : t,
    );
    set({ queue });
    saveState({ ...get(), queue });
  },

  pause: (id) => {
    const queue = get().queue.map((t) =>
      t.id === id && t.status === "running"
        ? { ...t, status: "paused" as IdleTaskStatus }
        : t,
    );
    set({ queue });
    saveState({ ...get(), queue });
  },

  resume: (id) => {
    const queue = get().queue.map((t) =>
      t.id === id && t.status === "paused"
        ? { ...t, status: "running" as IdleTaskStatus }
        : t,
    );
    set({ queue });
    saveState({ ...get(), queue });
  },

  remove: (id) => {
    const queue = get().queue.filter((t) => t.id !== id);
    set({ queue });
    saveState({ ...get(), queue });
  },

  getQueue: () => get().queue,

  getRunning: () => get().queue.find((t) => t.status === "running") ?? null,
}));
