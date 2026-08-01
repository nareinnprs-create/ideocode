import { create } from "zustand";
import {
  getFileTree,
  readFile,
  writeFile,
  type FileNode,
} from "../lib/tauri-commands";

interface FileState {
  rootPath: string;
  tree: FileNode[];
  expandedPaths: Set<string>;
  selectedFile: string | null;
  fileContent: string | null;
  dirty: boolean;
  loading: boolean;
  error: string | null;
  setRootPath: (path: string) => void;
  loadTree: () => Promise<void>;
  toggleExpanded: (path: string) => void;
  selectFile: (path: string) => Promise<void>;
  setContent: (content: string) => void;
  saveFile: () => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  rootPath: "",
  tree: [],
  expandedPaths: new Set(),
  selectedFile: null,
  fileContent: null,
  dirty: false,
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

  selectFile: async (path) => {
    set({ selectedFile: path, fileContent: null, dirty: false });
    try {
      const content = await readFile(path);
      set({ fileContent: content, dirty: false });
    } catch (e) {
      set({ error: `Failed to read file: ${e}`, fileContent: null, dirty: false });
    }
  },

  setContent: (content) => set({ fileContent: content, dirty: true }),

  saveFile: async () => {
    const { selectedFile, fileContent } = get();
    if (!selectedFile || fileContent === null) return;
    try {
      await writeFile(selectedFile, fileContent);
      set({ dirty: false });
    } catch (e) {
      set({ error: `Failed to save file: ${e}` });
    }
  },
}));
