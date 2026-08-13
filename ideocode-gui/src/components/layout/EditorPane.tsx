import { useAppStore } from "../../stores/appStore";
import { useFileStore } from "../../stores/fileStore";
import { CodeEditor } from "../editor/CodeEditor";
import { TabBar } from "./TabBar";
import { Composer } from "../chat/Composer";
import { ChatMessageList } from "../chat/ChatMessageList";

export function EditorPane() {
  const editorSplit = useAppStore((s) => s.editorSplit);
  const activeFile = useFileStore((s) => s.activeFile);

  const hasFileSelected = !!activeFile;

  return (
    <main className="flex flex-col flex-1 min-w-0">
      {hasFileSelected && (
        <div className="flex flex-col flex-1 min-h-0 border-b border-border-subtle">
          <TabBar />
          {editorSplit ? (
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 min-h-0 min-w-0">
                <CodeEditor />
              </div>
              <div className="w-px bg-border-subtle shrink-0" />
              <div className="flex-1 min-h-0 min-w-0">
                <CodeEditor />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <CodeEditor />
            </div>
          )}
        </div>
      )}

      <ChatMessageList />

      <Composer />
    </main>
  );
}
