import { create } from "zustand";
import { readFile, fileExists } from "../lib/tauri-commands";

export interface ContextFile {
  path: string;
  content: string;
  pinned: boolean;
}

interface ContextState {
  files: ContextFile[];
  autoInclude: boolean;
  addFile: (path: string, pinned?: boolean) => Promise<void>;
  removeFile: (path: string) => void;
  togglePinned: (path: string) => void;
  clearUnpinned: () => void;
  setAutoInclude: (v: boolean) => void;
  loadAutoContext: (rootPath: string) => Promise<void>;
}

const AUTO_CONTEXT_NAMES = [
  "README.md",
  "README",
  "AGENTS.md",
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "go.mod",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  ".env.example",
];

export const useContextStore = create<ContextState>((set, get) => ({
  files: [],
  autoInclude: true,

  addFile: async (path: string, pinned = true) => {
    if (get().files.some((f) => f.path === path)) return;
    try {
      let content = "";
      if (await fileExists(path)) {
        content = await readFile(path);
        if (content.length > 30_000) content = content.slice(0, 30_000) + "\n... [truncated]";
      }
      set((s) => ({ files: [...s.files, { path, content, pinned }] }));
    } catch {
      // file not readable
    }
  },

  removeFile: (path) => set((s) => ({ files: s.files.filter((f) => f.path !== path) })),

  togglePinned: (path) =>
    set((s) => ({
      files: s.files.map((f) => (f.path === path ? { ...f, pinned: !f.pinned } : f)),
    })),

  clearUnpinned: () => set((s) => ({ files: s.files.filter((f) => f.pinned) })),

  setAutoInclude: (v) => set({ autoInclude: v }),

  loadAutoContext: async (rootPath: string) => {
    if (!rootPath) return;
    const current = get().files;
    const existingPaths = new Set(current.map((f) => f.path));
    const newFiles: ContextFile[] = [];
    for (const name of AUTO_CONTEXT_NAMES) {
      const fullPath = `${rootPath}/${name}`;
      if (existingPaths.has(fullPath)) continue;
      if (await fileExists(fullPath)) {
        try {
          let content = await readFile(fullPath);
          if (content.length > 30_000) content = content.slice(0, 30_000) + "\n... [truncated]";
          newFiles.push({ path: fullPath, content, pinned: false });
        } catch {
          // skip
        }
      }
    }
    if (newFiles.length > 0) {
      set((s) => ({ files: [...s.files, ...newFiles] }));
    }
  },
}));
