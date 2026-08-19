import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { useChatStore } from "../stores/chatStore";
import { useFileStore } from "../stores/fileStore";

export function useKeyboard() {
  const {
    toggleCommandPalette,
    toggleSidebar,
    toggleRightPanel,
    toggleBottomPanel,
    setBottomPanelOpen,
    setComposerOpen,
  } = useAppStore();

  useEffect(() => {
    const STORAGE_KEY = "idc-shortcuts";
    interface Shortcut { id: string; action: string; keys: string; }
    let userShortcuts: Shortcut[] = [];
    try {
      userShortcuts = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { userShortcuts = []; }

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+K / Cmd+Shift+P — Command Palette
      if ((mod && e.key === "k") || (mod && e.shiftKey && e.key === "P")) {
        e.preventDefault();
        toggleCommandPalette();
      }

      // Cmd+B — Toggle sidebar
      if (mod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }

      // Cmd+\ — Toggle right panel
      if (mod && e.key === "\\") {
        e.preventDefault();
        toggleRightPanel();
      }

      // Cmd+J — Toggle bottom panel
      if (mod && e.key === "j") {
        e.preventDefault();
        toggleBottomPanel();
      }

      // Cmd+` — Open terminal
      if (mod && e.key === "`") {
        e.preventDefault();
        const state = useAppStore.getState();
        state.setBottomPanel("terminal");
        state.setBottomPanelOpen(true);
      }

      // Cmd+N — New chat
      if (mod && e.key === "n") {
        e.preventDefault();
        void useChatStore.getState().clearMessages();
      }

      // Cmd+S — Save current file
      if (mod && e.key === "s") {
        e.preventDefault();
        void useFileStore.getState().saveFile();
      }

      // Cmd+I — Toggle Composer
      if (mod && e.key === "i") {
        e.preventDefault();
        const state = useAppStore.getState();
        state.setComposerOpen(!state.composerOpen);
      }

      // Cmd+P — File Quick Open
      if (mod && e.key === "p") {
        e.preventDefault();
        const state = useAppStore.getState();
        state.setFileQuickOpenOpen(!state.fileQuickOpenOpen);
      }

      // Ctrl+/ — Toggle command palette
      if (!e.metaKey && e.ctrlKey && e.key === "/") {
        e.preventDefault();
        toggleCommandPalette();
      }

      // Ctrl+T — Cycle thought level
      if (!e.metaKey && e.ctrlKey && e.key === "t") {
        e.preventDefault();
        const chat = useChatStore.getState();
        const order: Array<"low" | "high" | "max"> = ["low", "high", "max"];
        const idx = order.indexOf(chat.thoughtLevel);
        chat.setThoughtLevel(order[(idx + 1) % order.length]);
      }

      // Esc — Close overlays and panels
      if (e.key === "Escape") {
        const state = useAppStore.getState();
        state.setCommandPaletteOpen(false);
        state.setRightPanelOpen(false);
        state.setComposerOpen(false);
        setBottomPanelOpen(false);
      }

      // User-defined shortcuts
      for (const shortcut of userShortcuts) {
        const parts = shortcut.keys.toLowerCase().replace(/\s/g, "").split("+");
        const needsMod = parts.includes("cmd") || parts.includes("ctrl");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt");
        const keyPart = parts.find(p => !["cmd", "ctrl", "shift", "alt"].includes(p));

        if (needsMod !== mod) continue;
        if (needsShift !== e.shiftKey) continue;
        if (needsAlt !== e.altKey) continue;
        if (keyPart && e.key.toLowerCase() !== keyPart) continue;

        // Execute the action
        const app = useAppStore.getState();
        const chat = useChatStore.getState();
        const file = useFileStore.getState();
        switch (shortcut.action) {
          case "Command Palette": e.preventDefault(); app.toggleCommandPalette(); break;
          case "Toggle Sidebar": e.preventDefault(); app.toggleSidebar(); break;
          case "Toggle Right Panel": e.preventDefault(); app.toggleRightPanel(); break;
          case "Toggle Bottom Panel": e.preventDefault(); app.toggleBottomPanel(); break;
          case "Open Terminal": e.preventDefault(); app.setBottomPanel("terminal"); app.setBottomPanelOpen(true); break;
          case "New Chat": e.preventDefault(); void chat.clearMessages(); break;
          case "Save File": e.preventDefault(); void file.saveFile(); break;
          case "Quick Open File": e.preventDefault(); app.setFileQuickOpenOpen(!app.fileQuickOpenOpen); break;
          case "Toggle Composer": e.preventDefault(); app.setComposerOpen(!app.composerOpen); break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    toggleCommandPalette,
    toggleSidebar,
    toggleRightPanel,
    toggleBottomPanel,
    setBottomPanelOpen,
    setComposerOpen,
  ]);
}
