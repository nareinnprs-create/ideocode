import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";

export function useKeyboard() {
  const {
    toggleCommandPalette,
    toggleSidebar,
    toggleRightPanel,
    toggleBottomPanel,
    setBottomPanelOpen,
  } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+K — Command Palette
      if (mod && e.key === "k") {
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

      // Esc — Close overlays and panels
      if (e.key === "Escape") {
        const state = useAppStore.getState();
        state.setCommandPaletteOpen(false);
        state.setRightPanelOpen(false);
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
  ]);
}
