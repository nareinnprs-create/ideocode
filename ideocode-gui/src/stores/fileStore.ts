import { create } from "zustand";
import {
  getFileTree,
  readFile,
  writeFile,
  type FileNode,
} from "../lib/tauri-commands";
import { notify } from "./toastStore";
import { closeTab, openTab } from "../lib/tabs";

interface FileState {
  rootPath: string;
  tree: FileNode[];
  expandedPaths: Set<string>;
  openFiles: string[];
  activeFile: string | null;
  contents: Record<string, string>;
  dirty: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  setRootPath: (path: string) => void;
  loadTree: () => Promise<void>;
  toggleExpanded: (path: string) => void;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  setContent: (path: string, content: string) => void;
  saveFile: (path?: string, opts?: { silent?: boolean }) => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  rootPath: "",
  tree: [],
  expandedPaths: new Set(),
  openFiles: [],
  activeFile: null,
  contents: {},
  dirty: {},
  loading: false,
  error: null,

  setRootPath: (path) => set({ rootPath: path }),

  loadTree: async () => {
    const { rootPath } = get();
    if (!rootPath) {
      set({ tree: [], loading: false });
      return;
    }
    set({ loading: true });
    try {
      const tree = await getFileTree(rootPath, 2);
      set({ tree, loading: false });
    } catch (e) {
      set({ loading: false, error: `Failed to load tree: ${e}` });
    }
  },

  toggleExpanded: (path) => {
    const expanded = new Set(get().expandedPaths);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({ expandedPaths: expanded });
  },

  openFile: async (path) => {
    set((s) => {
      const next = openTab(
        { openFiles: s.openFiles, activeFile: s.activeFile },
        path,
      );
      return {
        openFiles: next.openFiles,
        activeFile: next.activeFile,
        error: null,
      };
    });

    const { contents } = get();
    if (contents[path] === undefined) {
      set({ contents: { ...contents, [path]: "" } });
      try {
        const content = await readFile(path);
        set((s) => ({ contents: { ...s.contents, [path]: content } }));
      } catch (e) {
        set({ error: `Failed to read file: ${e}` });
        notify("error", "Failed to open file", `${e}`);
      }
    }
  },

  closeFile: (path) => {
    const { openFiles, activeFile, contents, dirty } = get();
    const next = closeTab({ openFiles, activeFile }, path);
    const nextContents = { ...contents };
    const nextDirty = { ...dirty };
    delete nextContents[path];
    delete nextDirty[path];
    set({
      openFiles: next.openFiles,
      activeFile: next.activeFile,
      contents: nextContents,
      dirty: nextDirty,
    });
  },

  setContent: (path, content) =>
    set((s) => ({
      contents: { ...s.contents, [path]: content },
      dirty: { ...s.dirty, [path]: true },
    })),

  saveFile: async (path, opts) => {
    const { activeFile, contents } = get();
    const target = path ?? activeFile;
    if (!target || contents[target] === undefined) return;
    try {
      await writeFile(target, contents[target]);
      set((s) => ({ dirty: { ...s.dirty, [target]: false } }));
      if (!opts?.silent) {
        notify("success", "File saved", target.split(/[/\\]/).pop());
      }
    } catch (e) {
      set({ error: `Failed to save file: ${e}` });
      notify("error", "Failed to save file", `${e}`);
    }
  },
}));
