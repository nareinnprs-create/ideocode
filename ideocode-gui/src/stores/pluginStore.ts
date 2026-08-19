import { create } from "zustand";

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  source: "marketplace" | "custom" | "local";
  sourceUrl?: string;
  skills: string[];
  commands: string[];
  hooks: string[];
  mcpServers: string[];
  installedAt: number;
  updatedAt: number;
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  rating: number;
  sourceUrl: string;
  skills: string[];
  commands: string[];
  hooks: string[];
  mcpServers: string[];
}

interface PluginState {
  installed: Plugin[];
  marketplace: MarketplacePlugin[];
  customSources: string[];
}

interface PluginActions {
  install: (plugin: Omit<Plugin, "installedAt" | "updatedAt">) => Plugin;
  uninstall: (id: string) => void;
  toggle: (id: string) => void;
  update: (id: string, updates: Partial<Omit<Plugin, "id" | "installedAt">>) => void;
  addCustomSource: (url: string) => void;
  removeCustomSource: (url: string) => void;
  searchMarketplace: (query: string) => MarketplacePlugin[];
}

export type PluginStore = PluginState & PluginActions;

const STORAGE_KEY = "idc-plugins-v2";

function loadState(): PluginState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        installed: (parsed.installed ?? []) as Plugin[],
        marketplace: (parsed.marketplace ?? []) as MarketplacePlugin[],
        customSources: (parsed.customSources ?? []) as string[],
      };
    }
  } catch {}
  return { installed: [], marketplace: [], customSources: [] };
}

function saveState(state: PluginState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  ...loadState(),

  install: (plugin) => {
    const now = Date.now();
    const installed: Plugin = {
      ...plugin,
      enabled: true,
      installedAt: now,
      updatedAt: now,
    };
    const plugins = [...get().installed, installed];
    set({ installed: plugins });
    saveState({ ...get(), installed: plugins });
    return installed;
  },

  uninstall: (id) => {
    const installed = get().installed.filter((p) => p.id !== id);
    set({ installed });
    saveState({ ...get(), installed });
  },

  toggle: (id) => {
    const installed = get().installed.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p,
    );
    set({ installed });
    saveState({ ...get(), installed });
  },

  update: (id, updates) => {
    const installed = get().installed.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p,
    );
    set({ installed });
    saveState({ ...get(), installed });
  },

  addCustomSource: (url) => {
    const { customSources } = get();
    if (customSources.includes(url)) return;
    const updated = [...customSources, url];
    set({ customSources: updated });
    saveState({ ...get(), customSources: updated });
  },

  removeCustomSource: (url) => {
    const customSources = get().customSources.filter((u) => u !== url);
    set({ customSources });
    saveState({ ...get(), customSources });
  },

  searchMarketplace: (query) => {
    if (!query) return get().marketplace;
    const q = query.toLowerCase();
    return get().marketplace.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q),
    );
  },
}));
