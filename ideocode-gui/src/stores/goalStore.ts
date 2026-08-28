import { create } from "zustand";
import {
  setGoal as backendSetGoal,
  pauseGoal as backendPauseGoal,
  resumeGoal as backendResumeGoal,
  clearGoal as backendClearGoal,
} from "../lib/tauri-commands";

export type TaskStatus = "pending" | "in_progress" | "blocked" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dependencies: string[];
  createdAt: number;
  completedAt?: number;
}

export type GoalStatus = "idle" | "in_progress" | "paused" | "completed";

export interface GoalState {
  goal: string;
  status: GoalStatus;
  tasks: Task[];
  selectedTaskId: string | null;
}

interface GoalActions {
  setGoal: (goal: string) => void;
  startGoal: () => void;
  pauseGoal: () => void;
  completeGoal: () => void;
  clearGoal: () => void;
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  selectTask: (id: string | null) => void;
  addTasksFromGoal: (tasks: { title: string; description?: string; priority?: Task["priority"] }[]) => void;
}

export type GoalStore = GoalState & GoalActions;

const STORAGE_KEY = "idc-goal";

function loadState(): GoalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        goal: parsed.goal ?? "",
        status: parsed.status ?? "idle",
        tasks: (parsed.tasks ?? []).map((t: Record<string, unknown>) => ({
          ...t,
          id: t.id as string,
          title: t.title as string,
          description: (t.description as string) ?? "",
          status: (t.status as TaskStatus) ?? "pending",
          priority: (t.priority as Task["priority"]) ?? "medium",
          dependencies: (t.dependencies as string[]) ?? [],
          createdAt: (t.createdAt as number) ?? Date.now(),
          completedAt: t.completedAt as number | undefined,
        })),
        selectedTaskId: null,
      };
    }
  } catch {}
  return { goal: "", status: "idle", tasks: [], selectedTaskId: null };
}

function saveState(state: GoalState) {
  try {
    const { selectedTaskId: _, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

let taskCounter = 0;

function makeTaskId() {
  taskCounter += 1;
  return `task-${Date.now()}-${taskCounter}`;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  ...loadState(),

  setGoal: (goal) => {
    set({ goal });
    saveState({ ...get(), goal });
    backendSetGoal(goal).catch((err) => {
      console.error("Failed to persist goal to backend:", err);
    });
  },

  startGoal: () => {
    set({ status: "in_progress" });
    saveState({ ...get(), status: "in_progress" });
    backendResumeGoal().catch((err) => {
      console.error("Failed to resume goal on backend:", err);
    });
  },

  pauseGoal: () => {
    set({ status: "paused" });
    saveState({ ...get(), status: "paused" });
    backendPauseGoal().catch((err) => {
      console.error("Failed to pause goal on backend:", err);
    });
  },

  completeGoal: () => {
    const now = Date.now();
    const tasks = get().tasks.map((t) =>
      t.status !== "done" ? { ...t, status: "done" as TaskStatus, completedAt: now } : t
    );
    set({ status: "completed", tasks });
    saveState({ ...get(), status: "completed", tasks });
  },

  clearGoal: () => {
    const fresh = { goal: "", status: "idle" as GoalStatus, tasks: [], selectedTaskId: null };
    set(fresh);
    saveState(fresh);
    backendClearGoal().catch((err) => {
      console.error("Failed to clear goal on backend:", err);
    });
  },

  addTask: (task) => {
    const newTask: Task = {
      ...task,
      id: makeTaskId(),
      createdAt: Date.now(),
    };
    const tasks = [...get().tasks, newTask];
    set({ tasks });
    saveState({ ...get(), tasks });
  },

  updateTask: (id, updates) => {
    const tasks = get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tasks });
    saveState({ ...get(), tasks });
  },

  removeTask: (id) => {
    const tasks = get().tasks.filter((t) => t.id !== id);
    set({ tasks });
    saveState({ ...get(), tasks });
  },

  toggleTaskDone: (id) => {
    const now = Date.now();
    const tasks = get().tasks.map((t) => {
      if (t.id !== id) return t;
      const newStatus: TaskStatus = t.status === "done" ? "pending" : "done";
      return { ...t, status: newStatus, completedAt: newStatus === "done" ? now : undefined };
    });
    set({ tasks });
    saveState({ ...get(), tasks });
  },

  selectTask: (id) => set({ selectedTaskId: id }),

  addTasksFromGoal: (rawTasks) => {
    const now = Date.now();
    const newTasks: Task[] = rawTasks.map((t, i) => ({
      id: makeTaskId(),
      title: t.title,
      description: t.description ?? "",
      status: "pending" as TaskStatus,
      priority: t.priority ?? "medium",
      dependencies: [],
      createdAt: now + i,
    }));
    const tasks = [...get().tasks, ...newTasks];
    set({ tasks });
    saveState({ ...get(), tasks });
  },
}));
