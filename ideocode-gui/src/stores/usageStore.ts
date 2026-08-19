import { create } from "zustand";

export interface UsageRecord {
  id: string;
  timestamp: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  sessionId: string;
}

export interface DailyBreakdown {
  date: string;
  tokens: number;
  cost: number;
}

export interface ModelBreakdown {
  model: string;
  tokens: number;
  cost: number;
  count: number;
}

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  totalMessages: number;
  activeDays: number;
  streak: number;
  dailyBreakdown: DailyBreakdown[];
  modelBreakdown: ModelBreakdown[];
}

export type UsageDateRange = "all" | "30d" | "7d";

interface UsageState {
  records: UsageRecord[];
  dateRange: UsageDateRange;
}

interface UsageActions {
  record: (entry: Omit<UsageRecord, "id">) => void;
  setDateRange: (range: UsageDateRange) => void;
  getStats: () => UsageStats;
  getDailyTrend: () => DailyBreakdown[];
  getModelRanking: () => ModelBreakdown[];
}

export type UsageStore = UsageState & UsageActions;

const STORAGE_KEY = "idc-usage";

function loadState(): UsageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        records: (parsed.records ?? []) as UsageRecord[],
        dateRange: (parsed.dateRange as UsageDateRange) ?? "all",
      };
    }
  } catch {}
  return { records: [], dateRange: "all" };
}

function saveState(state: UsageState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `usage-${Date.now()}-${idCounter}`;
}

function filterByRange(records: UsageRecord[], range: UsageDateRange): UsageRecord[] {
  if (range === "all") return records;
  const now = Date.now();
  const days = range === "7d" ? 7 : 30;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return records.filter((r) => r.timestamp >= cutoff);
}

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0];
}

export const useUsageStore = create<UsageStore>((set, get) => ({
  ...loadState(),

  record: (entry) => {
    const newRecord: UsageRecord = { ...entry, id: makeId() };
    const records = [...get().records, newRecord];
    set({ records });
    saveState({ ...get(), records });
  },

  setDateRange: (dateRange) => {
    set({ dateRange });
    saveState({ ...get(), dateRange });
  },

  getStats: () => {
    const { records, dateRange } = get();
    const filtered = filterByRange(records, dateRange);

    const totalTokens = filtered.reduce((s, r) => s + r.totalTokens, 0);
    const totalCost = filtered.reduce((s, r) => s + r.cost, 0);
    const totalSessions = new Set(filtered.map((r) => r.sessionId)).size;
    const totalMessages = filtered.length;

    const daySet = new Set(filtered.map((r) => toDateString(r.timestamp)));
    const activeDays = daySet.size;

    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (daySet.has(toDateString(d.getTime()))) {
        streak++;
      } else {
        break;
      }
    }

    const dailyMap = new Map<string, DailyBreakdown>();
    for (const r of filtered) {
      const date = toDateString(r.timestamp);
      const existing = dailyMap.get(date) ?? { date, tokens: 0, cost: 0 };
      dailyMap.set(date, { date, tokens: existing.tokens + r.totalTokens, cost: existing.cost + r.cost });
    }
    const dailyBreakdown = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    const modelMap = new Map<string, ModelBreakdown>();
    for (const r of filtered) {
      const existing = modelMap.get(r.model) ?? { model: r.model, tokens: 0, cost: 0, count: 0 };
      modelMap.set(r.model, { model: r.model, tokens: existing.tokens + r.totalTokens, cost: existing.cost + r.cost, count: existing.count + 1 });
    }
    const modelBreakdown = [...modelMap.values()].sort((a, b) => b.tokens - a.tokens);

    return { totalTokens, totalCost, totalSessions, totalMessages, activeDays, streak, dailyBreakdown, modelBreakdown };
  },

  getDailyTrend: () => {
    const { records, dateRange } = get();
    const filtered = filterByRange(records, dateRange);
    const dailyMap = new Map<string, DailyBreakdown>();
    for (const r of filtered) {
      const date = toDateString(r.timestamp);
      const existing = dailyMap.get(date) ?? { date, tokens: 0, cost: 0 };
      dailyMap.set(date, { date, tokens: existing.tokens + r.totalTokens, cost: existing.cost + r.cost });
    }
    return [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  },

  getModelRanking: () => {
    const { records, dateRange } = get();
    const filtered = filterByRange(records, dateRange);
    const modelMap = new Map<string, ModelBreakdown>();
    for (const r of filtered) {
      const existing = modelMap.get(r.model) ?? { model: r.model, tokens: 0, cost: 0, count: 0 };
      modelMap.set(r.model, { model: r.model, tokens: existing.tokens + r.totalTokens, cost: existing.cost + r.cost, count: existing.count + 1 });
    }
    return [...modelMap.values()].sort((a, b) => b.tokens - a.tokens);
  },
}));
