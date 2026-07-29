import { create } from "zustand";

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
  | "settings";

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

  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  theme: "dark" | "light" | "midnight";
  setTheme: (t: "dark" | "light" | "midnight") => void;
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

  commandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  theme: "midnight",
  setTheme: (t) => set({ theme: t }),
}));
