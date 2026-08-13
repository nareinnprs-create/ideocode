import { useAppStore } from "../../stores/appStore";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { EditorPane } from "./EditorPane";
import { RightPanel } from "./RightPanel";
import { BottomPanelDock } from "./BottomPanelDock";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "../chat/CommandPalette";
import { ToastHost } from "./ToastHost";
import { ErrorBoundary } from "../ErrorBoundary";
import { useKeyboard } from "../../hooks/useKeyboard";

export function AppShell() {
  const { sidebarOpen, rightPanelOpen } = useAppStore();

  useKeyboard();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <ErrorBoundary variant="panel">
          {sidebarOpen && <Sidebar />}
        </ErrorBoundary>
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
      <CommandPalette />
      <ToastHost />
    </div>
  );
}
