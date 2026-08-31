import { create } from "zustand";
import { useFileStore } from "./fileStore";

export interface RunRecord {
  id: string;
  startedAt: number;
  completedAt?: number;
  status: "success" | "failed" | "skipped";
  output?: string;
}

export type AutomationFrequency =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

export type AutomationStatus = "active" | "paused" | "completed" | "failed";

export interface Automation {
  id: string;
  name: string;
  description: string;
  frequency: AutomationFrequency;
  cronExpr?: string;
  command: string;
  model?: string;
  mode?: string;
  thoughtLevel?: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  status: AutomationStatus;
  runHistory: RunRecord[];
  createdAt: number;
}

interface AutomationState {
  automations: Automation[];
  maxTasks: number;
}

interface AutomationActions {
  add: (
    automation: Omit<
      Automation,
      "id" | "createdAt" | "status" | "runHistory" | "enabled"
    > & Partial<Pick<Automation, "enabled">>,
  ) => Automation;
  update: (id: string, updates: Partial<Omit<Automation, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  runNow: (id: string) => Promise<void>;
  getNextRuns: () => { id: string; nextRun: number | undefined }[];
}

export type AutomationStore = AutomationState & AutomationActions;

const STORAGE_KEY = "idc-automations-v2";

function loadState(): AutomationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        automations: (parsed.automations ?? []) as Automation[],
        maxTasks: (parsed.maxTasks as number) ?? 20,
      };
    }
  } catch {}
  return { automations: [], maxTasks: 20 };
}

function saveState(state: AutomationState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `auto-${Date.now()}-${idCounter}`;
}

function makeRunId() {
  idCounter += 1;
  return `run-${Date.now()}-${idCounter}`;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

function computeNextRun(a: Pick<Automation, "frequency" | "cronExpr" | "lastRun">): number {
  const base = a.lastRun ?? Date.now();
  switch (a.frequency) {
    case "hourly":
      return base + HOUR_MS;
    case "daily":
      return base + DAY_MS;
    case "weekly":
      return base + WEEK_MS;
    case "monthly":
      return base + MONTH_MS;
    case "custom": {
      // basic cron-like: "HH:MM" or "m h * * *" -> treat as daily at HH:MM
      const m = /^(\d{1,2}):(\d{2})$/.exec(a.cronExpr ?? "");
      if (m) {
        const next = new Date();
        next.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
        if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
        return next.getTime();
      }
      return base + DAY_MS;
    }
  }
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startAutomationScheduler() {
  if (schedulerTimer) return;
  // Recompute next runs for any automations missing one.
  const state = useAutomationStore.getState();
  const needsUpdate = state.automations
    .filter((a) => a.enabled && a.status === "active")
    .filter((a) => !a.nextRun);
  if (needsUpdate.length > 0) {
    const next = state.automations.map((a) => {
      if (!a.enabled || a.status !== "active" || a.nextRun) return a;
      return { ...a, nextRun: computeNextRun(a) };
    });
    useAutomationStore.setState({ automations: next });
  }
  schedulerTimer = setInterval(() => {
    const now = Date.now();
    const st = useAutomationStore.getState();
    const due = st.automations.filter(
      (a) => a.enabled && a.status === "active" && a.nextRun && a.nextRun <= now,
    );
    for (const a of due) {
      // Run and schedule the next occurrence.
      void st.runNow(a.id);
      const updated = useAutomationStore.getState().automations.map((x) =>
        x.id === a.id ? { ...x, nextRun: computeNextRun({ ...x, lastRun: now }) } : x,
      );
      useAutomationStore.setState({ automations: updated });
    }
  }, 60 * 1000);
}

export function stopAutomationScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

export const useAutomationStore = create<AutomationStore>((set, get) => ({
  ...loadState(),

  add: (automation) => {
    const now = Date.now();
    const newAuto: Automation = {
      ...automation,
      id: makeId(),
      enabled: automation.enabled ?? true,
      status: "active",
      runHistory: [],
      createdAt: now,
    };
    const automations = [...get().automations, newAuto];
    set({ automations });
    saveState({ ...get(), automations });
    // Schedule the first run for a newly-created active automation.
    if (newAuto.enabled && newAuto.status === "active") {
      const nextRun = computeNextRun(newAuto);
      const updated = useAutomationStore.getState().automations.map((a) =>
        a.id === newAuto.id ? { ...a, nextRun } : a,
      );
      useAutomationStore.setState({ automations: updated });
    }
    return newAuto;
  },

  update: (id, updates) => {
    const automations = get().automations.map((a) =>
      a.id === id ? { ...a, ...updates } : a,
    );
    set({ automations });
    saveState({ ...get(), automations });
  },

  remove: (id) => {
    const automations = get().automations.filter((a) => a.id !== id);
    set({ automations });
    saveState({ ...get(), automations });
  },

  toggle: (id) => {
    const automations = get().automations.map((a) =>
      a.id === id
        ? {
            ...a,
            enabled: !a.enabled,
            nextRun: !a.enabled ? computeNextRun(a) : undefined,
          }
        : a,
    );
    set({ automations });
    saveState({ ...get(), automations });
  },

  pause: (id) => {
    const automations = get().automations.map((a) =>
      a.id === id ? { ...a, status: "paused" as AutomationStatus, nextRun: undefined } : a,
    );
    set({ automations });
    saveState({ ...get(), automations });
  },

  resume: (id) => {
    const automations = get().automations.map((a) =>
      a.id === id ? { ...a, status: "active" as AutomationStatus, nextRun: computeNextRun(a) } : a,
    );
    set({ automations });
    saveState({ ...get(), automations });
  },

  runNow: async (id) => {
    const state = get();
    const auto = state.automations.find((a) => a.id === id);
    if (!auto) return;

    const runId = makeRunId();
    const run: RunRecord = { id: runId, startedAt: Date.now(), status: "success" };

    const updatedAutomations = state.automations.map((a) => {
      if (a.id !== id) return a;
      return {
        ...a,
        lastRun: run.startedAt,
        runHistory: [...a.runHistory, run],
      };
    });
    set({ automations: updatedAutomations });
    saveState({ ...get(), automations: updatedAutomations });

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const rootPath = useFileStore.getState().rootPath;
      const result = await invoke<{ id: string; status: string; output: string }>(
        "run_automation",
        { name: auto.name, command: auto.command, cwd: rootPath },
      );

      const completedAutomations = get().automations.map((a) => {
        if (a.id !== id) return a;
        const history = a.runHistory.map((r) =>
          r.id === runId
            ? { ...r, completedAt: Date.now(), output: result.output || result.status, status: "success" as const }
            : r,
        );
        return { ...a, runHistory: history, nextRun: computeNextRun({ ...a, lastRun: Date.now() }) };
      });
      set({ automations: completedAutomations });
      saveState({ ...get(), automations: completedAutomations });
    } catch (e) {
      const failedAutomations = get().automations.map((a) => {
        if (a.id !== id) return a;
        const history = a.runHistory.map((r) =>
          r.id === runId
            ? { ...r, completedAt: Date.now(), status: "failed" as const, output: String(e) }
            : r,
        );
        return { ...a, runHistory: history, nextRun: computeNextRun({ ...a, lastRun: Date.now() }) };
      });
      set({ automations: failedAutomations });
      saveState({ ...get(), automations: failedAutomations });
    }
  },

  getNextRuns: () =>
    get().automations
      .filter((a) => a.enabled && a.status === "active")
      .map((a) => ({ id: a.id, nextRun: a.nextRun })),
}));
