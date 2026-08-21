import { useAppStore } from "../../stores/appStore";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { EditorPane } from "./EditorPane";
import { RightPanel } from "./RightPanel";
import { BottomPanelDock } from "./BottomPanelDock";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "../chat/CommandPalette";
import { FileQuickOpen } from "../editor/FileQuickOpen";
import { ComposerPane } from "../chat/ComposerPane";
import { ToastHost } from "./ToastHost";
import { ErrorBoundary } from "../ErrorBoundary";
import { useKeyboard } from "../../hooks/useKeyboard";

export function AppShell() {
  const { sidebarOpen, rightPanelOpen } = useAppStore();

  useKeyboard();

  return (
    <div className="relative isolate flex h-screen w-screen overflow-hidden bg-surface text-fg-primary">
      {/* Aurora ambient background */}
      <div className="aurora" aria-hidden="true" />

      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <ErrorBoundary variant="panel">
        {sidebarOpen && <Sidebar />}
      </ErrorBoundary>

      {/* Main content area */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 bg-surface">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <ErrorBoundary variant="panel">
            <EditorPane />
          </ErrorBoundary>
          <ErrorBoundary variant="panel">
            {rightPanelOpen && <RightPanel />}
          </ErrorBoundary>
        </div>
        <ErrorBoundary variant="panel">
          <BottomPanelDock />
        </ErrorBoundary>
        <ErrorBoundary variant="panel">
          <StatusBar />
        </ErrorBoundary>
      </div>

      {/* Overlays */}
      <CommandPalette />
      <FileQuickOpen />
      <ComposerPane />
      <ToastHost />
    </div>
  );
}
