import { create } from "zustand";
import {
  gitStatus as tauriGitStatus,
  gitDiff as tauriGitDiff,
  gitCommit as tauriGitCommit,
  gitAdd as tauriGitAdd,
  gitUnstage as tauriGitUnstage,
  gitBranches as tauriGitBranches,
  gitCheckout as tauriGitCheckout,
  gitStash as tauriGitStash,
  gitPull as tauriGitPull,
  gitPush as tauriGitPush,
  type GitStatus,
  type GitBranch,
} from "../lib/tauri-commands";
import { notify } from "./toastStore";
import { confirmSafetyRule } from "../lib/safety";
import { eventBus } from "../lib/eventBus";

interface GitState {
  status: GitStatus | null;
  diff: string;
  loading: boolean;
  error: string | null;
  branches: GitBranch[];
  branchesLoading: boolean;
  stashCount: number;
  loadStatus: (path: string) => Promise<void>;
  loadDiff: (path: string, file?: string) => Promise<void>;
  commit: (path: string, message: string, amend?: boolean) => Promise<void>;
  stageFile: (path: string, file: string) => Promise<void>;
  unstageFile: (path: string, file: string) => Promise<void>;
  stageAll: (path: string) => Promise<void>;
  unstageAll: (path: string) => Promise<void>;
  loadBranches: (path: string) => Promise<void>;
  checkoutBranch: (path: string, branch: string) => Promise<void>;
  stash: (path: string) => Promise<void>;
  pull: (path: string) => Promise<void>;
  push: (path: string) => Promise<void>;
}

export const useGitStore = create<GitState>((set) => ({
  status: null,
  diff: "",
  loading: false,
  error: null,
  branches: [],
  branchesLoading: false,
  stashCount: 0,

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

  commit: async (path: string, message: string, amend?: boolean) => {
    if (amend && !await confirmSafetyRule("git-force")) return;
    try {
      const finalMsg = amend ? `--amend -m "${message}"` : message;
      await tauriGitCommit(path, finalMsg);
    } catch (e) {
      set({ error: `Git commit failed: ${e}` });
      notify("error", "Git commit failed", `${e}`);
      return;
    }
    notify("success", "Changes committed", amend ? "Amended" : message);
    eventBus.emit("output", `[git] Committed: ${message}`);
    try {
      const status = await tauriGitStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: `Commit succeeded, but status refresh failed: ${e}` });
    }
  },

  stageFile: async (path: string, file: string) => {
    try {
      await tauriGitAdd(path, file);
      const status = await tauriGitStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: `Git add failed: ${e}` });
      notify("error", "Failed to stage file", `${e}`);
    }
  },

  unstageFile: async (path: string, file: string) => {
    try {
      await tauriGitUnstage(path, file);
      const status = await tauriGitStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: `Git restore failed: ${e}` });
      notify("error", "Failed to unstage file", `${e}`);
    }
  },

  stageAll: async (path: string) => {
    const { status } = useGitStore.getState();
    if (!status) return;
    try {
      for (const f of [...status.modified, ...status.untracked]) {
        await tauriGitAdd(path, f.path);
      }
      const updated = await tauriGitStatus(path);
      set({ status: updated, error: null });
    } catch (e) {
      set({ error: `Stage all failed: ${e}` });
    }
  },

  unstageAll: async (path: string) => {
    const { status } = useGitStore.getState();
    if (!status) return;
    try {
      for (const f of status.staged) {
        await tauriGitUnstage(path, f.path);
      }
      const updated = await tauriGitStatus(path);
      set({ status: updated, error: null });
    } catch (e) {
      set({ error: `Unstage all failed: ${e}` });
    }
  },

  loadBranches: async (path: string) => {
    set({ branchesLoading: true });
    try {
      const branches = await tauriGitBranches(path);
      set({ branches, branchesLoading: false, error: null });
    } catch (e) {
      set({ branchesLoading: false, error: `Branches failed: ${e}` });
    }
  },

  checkoutBranch: async (path: string, branch: string) => {
    try {
      await tauriGitCheckout(path, branch);
      notify("success", "Branch switched", `Now on ${branch}`);
      eventBus.emit("output", `[git] Switched to branch: ${branch}`);
      const [status, branches] = await Promise.all([
        tauriGitStatus(path),
        tauriGitBranches(path),
      ]);
      set({ status, branches, error: null });
    } catch (e) {
      set({ error: `Checkout failed: ${e}` });
      notify("error", "Checkout failed", `${e}`);
    }
  },

  stash: async (path: string) => {
    try {
      await tauriGitStash(path);
      notify("success", "Stashed", "Changes stashed");
      eventBus.emit("output", "[git] Changes stashed");
      const status = await tauriGitStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: `Stash failed: ${e}` });
      notify("error", "Stash failed", `${e}`);
    }
  },

  pull: async (path: string) => {
    try {
      await tauriGitPull(path);
      notify("success", "Pull", "Pull completed");
      eventBus.emit("output", "[git] Pull completed");
      const status = await tauriGitStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: `Pull failed: ${e}` });
      notify("error", "Pull failed", `${e}`);
    }
  },

  push: async (path: string) => {
    try {
      await tauriGitPush(path);
      notify("success", "Push", "Push completed");
      eventBus.emit("output", "[git] Push completed");
      const status = await tauriGitStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: `Push failed: ${e}` });
      notify("error", "Push failed", `${e}`);
    }
  },
}));
