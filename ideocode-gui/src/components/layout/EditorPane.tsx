import { useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { useFileStore } from "../../stores/fileStore";
import { CodeEditor } from "../editor/CodeEditor";
import { TabBar } from "./TabBar";
import { Composer } from "../chat/Composer";
import { ChatMessageList } from "../chat/ChatMessageList";
import { WelcomeScreen } from "../editor/WelcomeScreen";
import { useDragResize } from "../../hooks/useDragResize";

export function EditorPane() {
  const editorSplit = useAppStore((s) => s.editorSplit);
  const splitFile = useAppStore((s) => s.splitFile);
  const chatPanelOpen = useAppStore((s) => s.chatPanelOpen);
  const chatPanelWidth = useAppStore((s) => s.chatPanelWidth);
  const setChatPanelWidth = useAppStore((s) => s.setChatPanelWidth);
  const activeFile = useFileStore((s) => s.activeFile);

  const hasFileSelected = !!activeFile;

  const widthRef = useRef(chatPanelWidth);
  widthRef.current = chatPanelWidth;
  const bind = useDragResize(
    (dx) => setChatPanelWidth(widthRef.current - dx),
    "col-resize",
  );

  const editors = editorSplit ? (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 min-h-0 min-w-0">
        <CodeEditor />
      </div>
      <div className="w-px bg-border-subtle shrink-0" />
      <div className="flex-1 min-h-0 min-w-0">
        <CodeEditor file={splitFile ?? activeFile ?? undefined} />
      </div>
    </div>
  ) : (
    <div className="flex-1 min-h-0">
      <CodeEditor />
    </div>
  );

  const chatColumn = (
    <div
      className="flex flex-col min-w-0 bg-transparent border-l border-border-default relative z-10"
      style={{ width: chatPanelWidth }}
    >
      <div
        {...bind}
        role="separator"
        aria-label="Resize chat panel"
        className="absolute left-0 top-0 bottom-0 w-[3px] -ml-[1px] cursor-col-resize touch-none z-10 resize-handle-x"
      />
      <ChatMessageList />
      <Composer />
    </div>
  );

  if (!hasFileSelected) {
    return (
      <main id="main-content" className="flex flex-1 min-w-0">
        <div className="flex flex-col flex-1 min-w-0">
          <WelcomeScreen />
        </div>
        {chatPanelOpen && chatColumn}
      </main>
    );
  }

  return (
    <main id="main-content" className="flex flex-1 min-w-0">
      <div className="flex flex-col flex-1 min-w-0">
        <TabBar />
        {editors}
      </div>
      {chatPanelOpen && chatColumn}
    </main>
  );
}
