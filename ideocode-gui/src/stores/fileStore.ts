import { create } from "zustand";
import {
  getFileTree,
  readFile,
  type FileNode,
} from "../lib/tauri-commands";

interface FileState {
  rootPath: string;
  tree: FileNode[];
  expandedPaths: Set<string>;
  selectedFile: string | null;
  fileContent: string | null;
  loading: boolean;
  setRootPath: (path: string) => void;
  loadTree: () => Promise<void>;
  toggleExpanded: (path: string) => void;
  selectFile: (path: string) => Promise<void>;
  collapseAll: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  rootPath: "C:\\Users\\manag\\IDEOCODE\\jcode",
  tree: [],
  expandedPaths: new Set(),
  selectedFile: null,
  fileContent: null,
  loading: false,

  setRootPath: (path) => set({ rootPath: path }),

  loadTree: async () => {
    const { rootPath } = get();
    set({ loading: true });
    try {
      const tree = await getFileTree(rootPath, 2);
      set({ tree, loading: false });
    } catch (e) {
      console.error("Failed to load tree:", e);
      set({ loading: false });
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
    set({ selectedFile: path, fileContent: null });
    try {
      const content = await readFile(path);
      set({ fileContent: content });
    } catch (e) {
      console.error("Failed to read file:", e);
      set({ fileContent: `Error reading file: ${e}` });
    }
  },

  collapseAll: () => set({ expandedPaths: new Set() }),
}));
