import { create } from "zustand";
import {
  gitStatus as tauriGitStatus,
  gitDiff as tauriGitDiff,
  gitCommit as tauriGitCommit,
  type GitStatus,
} from "../lib/tauri-commands";

interface GitState {
  status: GitStatus | null;
  diff: string;
  loading: boolean;
  loadStatus: (path: string) => Promise<void>;
  loadDiff: (path: string, file?: string) => Promise<void>;
  commit: (path: string, message: string) => Promise<void>;
}

export const useGitStore = create<GitState>((set) => ({
  status: null,
  diff: "",
  loading: false,

  loadStatus: async (path: string) => {
    set({ loading: true });
    try {
      const status = await tauriGitStatus(path);
      set({ status, loading: false });
    } catch (e) {
      console.error("Git status failed:", e);
      set({ loading: false });
    }
  },

  loadDiff: async (path: string, file?: string) => {
    try {
      const diff = await tauriGitDiff(path, file);
      set({ diff });
    } catch (e) {
      console.error("Git diff failed:", e);
    }
  },

  commit: async (path: string, message: string) => {
    try {
      await tauriGitCommit(path, message);
      // Reload status after commit
      const status = await tauriGitStatus(path);
      set({ status });
    } catch (e) {
      console.error("Git commit failed:", e);
    }
  },
}));
