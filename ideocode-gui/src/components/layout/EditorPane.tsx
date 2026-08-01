import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { MarkdownRenderer } from "../chat/MarkdownRenderer";
import { ToolCallCard } from "../chat/ToolCallCard";
import { CodeEditor } from "../editor/CodeEditor";
import type { Message } from "../../lib/tauri-commands";

export function EditorPane() {
  const [input, setInput] = useState("");
  const [micActive, setMicActive] = useState(false);
  const { messages, loading, error, sendMessage } = useChatStore();
  const { selectedFile } = useFileStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFileSelected = !!selectedFile;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="flex flex-col flex-1 min-w-0">
      {hasFileSelected ? (
        /* Split: code editor + chat */
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 border-b border-border-subtle">
            <CodeEditor />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatArea
              messages={messages}
              loading={loading}
              error={error}
              messagesEndRef={messagesEndRef}
            />
          </div>
        </div>
      ) : (
        /* Chat only */
        <ChatArea
          messages={messages}
          loading={loading}
          error={error}
          messagesEndRef={messagesEndRef}
        />
      )}

      {/* Input bar */}
      <div className="border-t border-border-subtle bg-bg-secondary p-3">
        <div className="flex items-end gap-2 glass rounded-xl px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                setInput((prev) => prev + files.map((f) => `[Attached: ${f.name}]`).join("\n"));
              }
              e.target.value = "";
            }}
          />
          <button
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-text-muted hover:text-text-primary transition-fast rounded-md hover:bg-bg-elevated"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted
              resize-none outline-none text-sm leading-relaxed max-h-32
              font-mono"
          />

          <button
            title={micActive ? "Stop voice input" : "Voice input"}
            onClick={() => setMicActive(!micActive)}
            className={`p-1.5 transition-fast rounded-md hover:bg-bg-elevated ${
              micActive ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Mic size={18} />
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="Send message"
            className="p-1.5 rounded-md transition-fast
              bg-accent-primary text-white
              hover:bg-accent-hover
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}

function ChatArea({
  messages,
  loading,
  error,
  messagesEndRef,
}: {
  messages: Message[];
  loading: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {error && (
        <div className="px-3 py-2 rounded bg-error/10 border border-error/30 text-error text-xs">
          {error}
        </div>
      )}
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <div className="text-4xl font-display font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              IDEOCODE
            </div>
            <p className="text-text-muted text-sm">
              Multi-model AI coding assistant
            </p>
            <div className="flex items-center justify-center gap-2 text-text-muted text-xs mt-4">
              <kbd className="px-1.5 py-0.5 bg-bg-elevated rounded text-[10px] font-mono">
                Ctrl
              </kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-bg-elevated rounded text-[10px] font-mono">
                K
              </kbd>
              <span className="ml-1">Command Palette</span>
            </div>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {loading && (
        <div className="flex items-center gap-2 text-text-muted text-sm animate-pulse">
          <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          Thinking...
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-accent-primary text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start max-w-[85%]">
      <div className="space-y-1">
        {message.tool_calls?.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}

        {message.content && (
          <div className="rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-bg-elevated text-text-primary border border-border-subtle">
            <MarkdownRenderer content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}
