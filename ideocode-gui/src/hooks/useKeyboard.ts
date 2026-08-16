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

      // Esc — Close overlays and panels
      if (e.key === "Escape") {
        const state = useAppStore.getState();
        state.setCommandPaletteOpen(false);
        state.setRightPanelOpen(false);
        state.setComposerOpen(false);
        setBottomPanelOpen(false);
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
