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
    <div className="relative isolate flex h-screen w-screen overflow-hidden bg-background-alt text-foreground">
      <ErrorBoundary variant="panel">
        {sidebarOpen && <Sidebar />}
      </ErrorBoundary>
      <div className="relative z-10 flex flex-col flex-1 min-w-0 bg-window-bg">
        <TopBar />
        <div className="flex flex-1 min-h-0 z-10">
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
      <CommandPalette />
      <FileQuickOpen />
      <ComposerPane />
      <ToastHost />
    </div>
  );
}
