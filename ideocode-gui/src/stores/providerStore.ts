import { create } from "zustand";
import {
  listProviders as tauriListProviders,
  getProviderStatus,
  type Provider,
  type ProviderStatus,
} from "../lib/tauri-commands";

interface ProviderState {
  providers: Provider[];
  status: ProviderStatus | null;
  loading: boolean;
  loadProviders: () => Promise<void>;
  loadStatus: () => Promise<void>;
}

export const useProviderStore = create<ProviderState>((set) => ({
  providers: [],
  status: null,
  loading: false,

  loadProviders: async () => {
    set({ loading: true });
    try {
      const providers = await tauriListProviders();
      set({ providers, loading: false });
    } catch (e) {
      console.error("Failed to load providers:", e);
      set({ loading: false });
    }
  },

  loadStatus: async () => {
    try {
      const status = await getProviderStatus();
      set({ status });
    } catch (e) {
      console.error("Failed to load provider status:", e);
    }
  },
}));
