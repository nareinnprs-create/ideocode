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
  error: string | null;
  loadStatus: (path: string) => Promise<void>;
  loadDiff: (path: string, file?: string) => Promise<void>;
  commit: (path: string, message: string) => Promise<void>;
}

export const useGitStore = create<GitState>((set) => ({
  status: null,
  diff: "",
  loading: false,
  error: null,

  loadStatus: async (path: string) => {
    set({ loading: true });
    try {
      const status = await tauriGitStatus(path);
      set({ status, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: `Git status failed: ${e}` });
    }
  },

  loadDiff: async (path: string, file?: string) => {
    try {
      const diff = await tauriGitDiff(path, file);
      set({ diff, error: null });
    } catch (e) {
      set({ error: `Git diff failed: ${e}` });
    }
  },

  commit: async (path: string, message: string) => {
    try {
      await tauriGitCommit(path, message);
    } catch (e) {
      set({ error: `Git commit failed: ${e}` });
      return;
    }
    // The commit itself succeeded; a failure to refresh status afterwards is a
    // separate, non-fatal error and must not be reported as a failed commit.
    try {
      const status = await tauriGitStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: `Commit succeeded, but status refresh failed: ${e}` });
    }
  },
}));
