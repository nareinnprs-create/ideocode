import { create } from "zustand";
import { THEME_IDS, type Theme } from "../lib/theme-registry";

export type PanelId =
  | "chat"
  | "files"
  | "git"
  | "search"
  | "build"
  | "terminal"
  | "providers"
  | "sessions"
  | "editor"
  | "debug"
  | "settings"
  | "memory"
  | "issues"
  | "browser"
  | "composer";

interface AppState {
  version: string;
  setVersion: (v: string) => void;

  activePanel: PanelId;
  setActivePanel: (p: PanelId) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;

  rightPanel: PanelId;
  setRightPanel: (p: PanelId) => void;

  rightPanelWidth: number;
  setRightPanelWidth: (w: number) => void;

  bottomPanelOpen: boolean;
  toggleBottomPanel: () => void;
  setBottomPanelOpen: (open: boolean) => void;

  bottomPanel: PanelId;
  setBottomPanel: (p: PanelId) => void;

  bottomPanelHeight: number;
  setBottomPanelHeight: (h: number) => void;

  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;

  editorSplit: boolean;
  toggleEditorSplit: () => void;

  chatPanelOpen: boolean;
  setChatPanelOpen: (open: boolean) => void;

  chatPanelWidth: number;
  setChatPanelWidth: (w: number) => void;

  theme: Theme;
  setTheme: (t: Theme) => void;

  accentColor: string;
  setAccentColor: (c: string) => void;

  uiFontSize: number;
  setUiFontSize: (n: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  version: "0.1.0",
  setVersion: (v) => set({ version: v }),

  activePanel: "chat",
  setActivePanel: (p) => set({ activePanel: p }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  rightPanelOpen: false,
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

  rightPanel: "files",
  setRightPanel: (p) => set({ rightPanel: p }),

  rightPanelWidth: 320,
  setRightPanelWidth: (w) =>
    set({ rightPanelWidth: Math.min(560, Math.max(280, Math.round(w))) }),

  bottomPanelOpen: false,
  toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
  setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),

  bottomPanel: "terminal",
  setBottomPanel: (p) => set({ bottomPanel: p }),

  bottomPanelHeight: 200,
  setBottomPanelHeight: (h) =>
    set({ bottomPanelHeight: Math.min(560, Math.max(96, Math.round(h))) }),

  commandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  composerOpen: false,
  setComposerOpen: (open) => set({ composerOpen: open }),

  editorSplit: false,
  toggleEditorSplit: () => set((s) => ({ editorSplit: !s.editorSplit })),

  chatPanelOpen: true,
  setChatPanelOpen: (open) => set({ chatPanelOpen: open }),

  chatPanelWidth: 400,
  setChatPanelWidth: (w) =>
    set({ chatPanelWidth: Math.min(680, Math.max(320, Math.round(w))) }),

  theme: (() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("ideocode.theme") : null;
    return stored !== null && (THEME_IDS as readonly string[]).includes(stored)
      ? (stored as Theme)
      : "ideo_light";
  })(),
  setTheme: (t) => set({ theme: t }),

  accentColor: "#6366F1",
  setAccentColor: (c) => set({ accentColor: c }),

  uiFontSize: 13,
  setUiFontSize: (n) => set({ uiFontSize: n }),
}));
