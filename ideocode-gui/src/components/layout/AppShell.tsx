import { useAppStore } from "../../stores/appStore";
import { Sidebar } from "./Sidebar";
import { EditorPane } from "./EditorPane";
import { RightPanel } from "./RightPanel";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "../chat/CommandPalette";
import { useKeyboard } from "../../hooks/useKeyboard";

export function AppShell() {
  const { sidebarOpen, rightPanelOpen } = useAppStore();

  useKeyboard();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {sidebarOpen && <Sidebar />}
        <EditorPane />
        {rightPanelOpen && <RightPanel />}
      </div>
      <StatusBar />
      <CommandPalette />
    </div>
  );
}
