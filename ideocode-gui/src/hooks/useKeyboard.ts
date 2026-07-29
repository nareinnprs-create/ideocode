import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";

export function useKeyboard() {
  const { toggleCommandPalette, toggleSidebar, toggleRightPanel } =
    useAppStore();

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

      // Esc — Close overlays
      if (e.key === "Escape") {
        useAppStore.getState().setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCommandPalette, toggleSidebar, toggleRightPanel]);
}
