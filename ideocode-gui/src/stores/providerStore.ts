import { create } from "zustand";
import {
  listProviders as tauriListProviders,
  getProviderStatus,
  getSettings,
  updateSettings,
  type Provider,
  type ProviderStatus,
} from "../lib/tauri-commands";

interface ProviderState {
  providers: Provider[];
  status: ProviderStatus | null;
  loading: boolean;
  error: string | null;
  loadProviders: () => Promise<void>;
  loadStatus: () => Promise<void>;
  setActiveProvider: (providerId: string, modelId: string) => Promise<void>;
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  providers: [],
  status: null,
  loading: false,
  error: null,

  loadProviders: async () => {
    set({ loading: true, error: null });
    try {
      const providers = await tauriListProviders();
      set({ providers, loading: false });
    } catch (e) {
      set({ loading: false, error: `Failed to load providers: ${e}` });
    }
  },

  loadStatus: async () => {
    try {
      const status = await getProviderStatus();
      set({ status, error: null });
    } catch (e) {
      set({ error: `Failed to load provider status: ${e}` });
    }
  },

  setActiveProvider: async (providerId: string, modelId: string) => {
    try {
      const settings = await getSettings();
      settings.active_provider = providerId;
      settings.active_model = modelId;
      await updateSettings(settings);
      await get().loadStatus();
    } catch (e) {
      set({ error: `Failed to set active provider: ${e}` });
    }
  },
}));
