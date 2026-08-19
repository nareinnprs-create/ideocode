import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createTask as tauriCreateTask,
  startTask as tauriStartTask,
  cancelTask as tauriCancelTask,
  listTasks as tauriListTasks,
  deleteTask as tauriDeleteTask,
  clearFinishedTasks as tauriClearFinished,
} from '../lib/tauri-commands';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTask {
  id: string;
  name: string;
  command: string;
  cwd: string;
  status: TaskStatus;
  progress: number;
  output: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  exit_code: number | null;
}

interface TaskState {
  tasks: BackgroundTask[];
  create: (name: string, command: string, cwd: string) => Promise<BackgroundTask>;
  start: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearFinished: () => Promise<void>;
  refresh: () => Promise<void>;
}

function toTask(raw: any): BackgroundTask {
  return { ...raw, status: raw.status as TaskStatus };
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],

      create: async (name, command, cwd) => {
        const raw = await tauriCreateTask(name, command, cwd);
        const task = toTask(raw);
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },

      start: async (id) => {
        const raw = await tauriStartTask(id);
        const task = toTask(raw);
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? task : t)),
        }));
      },

      cancel: async (id) => {
        const raw = await tauriCancelTask(id);
        const task = toTask(raw);
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? task : t)),
        }));
      },

      remove: async (id) => {
        await tauriDeleteTask(id);
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
        }));
      },

      clearFinished: async () => {
        await tauriClearFinished();
        set((s) => ({
          tasks: s.tasks.filter(
            (t) => t.status === 'pending' || t.status === 'running'
          ),
        }));
      },

      refresh: async () => {
        const raws = await tauriListTasks();
        set({ tasks: raws.map(toTask) });
      },
    }),
    { name: 'ideocode-tasks', partialize: (s) => ({ tasks: s.tasks }) }
  )
);
