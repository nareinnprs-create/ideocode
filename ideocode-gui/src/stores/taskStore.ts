import { create } from "zustand";

export type TaskPriority = "low" | "medium" | "high";
export type TaskItemStatus = "todo" | "in_progress" | "done";

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: TaskItemStatus;
  priority: TaskPriority;
  group: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export interface TaskGroup {
  id: string;
  name: string;
  color: string;
}

export type SortField = "created" | "updated";
export type ViewMode = "grouped" | "workspace" | "timeline";

interface TaskState {
  tasks: TaskItem[];
  groups: TaskGroup[];
  searchQuery: string;
  sortField: SortField;
  viewMode: ViewMode;
  showArchived: boolean;
  selectedTaskId: string | null;
  expandedTaskId: string | null;
  setSearchQuery: (q: string) => void;
  setSortField: (f: SortField) => void;
  setViewMode: (m: ViewMode) => void;
  setShowArchived: (show: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setExpandedTaskId: (id: string | null) => void;
  addTask: (task: Omit<TaskItem, "id" | "createdAt" | "updatedAt" | "archived">) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  removeTask: (id: string) => void;
  addGroup: (group: Omit<TaskGroup, "id">) => string;
  removeGroup: (id: string) => void;
}

const GROUP_COLORS = [
  "#6366F1",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#14B8A6",
];

let taskCounter = 0;
let groupCounter = 0;

function makeTaskId() {
  taskCounter += 1;
  return `task-${Date.now()}-${taskCounter}`;
}

function makeGroupId() {
  groupCounter += 1;
  return `group-${Date.now()}-${groupCounter}`;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  groups: [],
  searchQuery: "",
  sortField: "updated",
  viewMode: "grouped",
  showArchived: false,
  selectedTaskId: null,
  expandedTaskId: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortField: (sortField) => set({ sortField }),
  setViewMode: (viewMode) => set({ viewMode }),
  setShowArchived: (showArchived) => set({ showArchived }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
  setExpandedTaskId: (expandedTaskId) => set({ expandedTaskId }),

  addTask: (task) => {
    const now = Date.now();
    const newTask: TaskItem = {
      ...task,
      id: makeTaskId(),
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    set((s) => ({ tasks: [...s.tasks, newTask] }));
  },

  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t,
      ),
    }));
  },

  removeTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  addGroup: (group) => {
    const id = makeGroupId();
    const color =
      GROUP_COLORS[get().groups.length % GROUP_COLORS.length];
    set((s) => ({ groups: [...s.groups, { ...group, id, color }] }));
    return id;
  },

  removeGroup: (id) => {
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      tasks: s.tasks.map((t) =>
        t.group === id ? { ...t, group: "" } : t,
      ),
    }));
  },
}));
