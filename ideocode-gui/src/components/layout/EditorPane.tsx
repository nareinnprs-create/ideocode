import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { MarkdownRenderer } from "../chat/MarkdownRenderer";
import { ToolCallCard } from "../chat/ToolCallCard";
import { CodeEditor } from "../editor/CodeEditor";
import { TabBar } from "./TabBar";
import type { Message } from "../../lib/tauri-commands";

export function EditorPane() {
  const [input, setInput] = useState("");
  const [micActive, setMicActive] = useState(false);
  const { messages, loading, error, sendMessage } = useChatStore();
  const { activeFile, openFile } = useFileStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasFileSelected = !!activeFile;

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

  const handleFileClick = (path: string) => {
    openFile(path);
  };

  return (
    <main className="flex flex-col flex-1 min-w-0">
      {hasFileSelected ? (
        /* Split: code editor + chat */
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-h-0 border-b border-border-subtle">
            <TabBar />
            <div className="flex-1 min-h-0">
              <CodeEditor />
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <ChatArea
              messages={messages}
              loading={loading}
              error={error}
              messagesEndRef={messagesEndRef}
              onFileClick={handleFileClick}
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
          onFileClick={handleFileClick}
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
  onFileClick,
}: {
  messages: Message[];
  loading: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onFileClick: (path: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {error && (
        <div className="px-3 py-2 rounded bg-error/10 border border-error/30 text-error text-xs animate-blur-in">
          {error}
        </div>
      )}
      {messages.length === 0 && !loading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3 animate-blur-in">
            <div className="text-4xl font-display font-bold text-gradient">
              IDEOCODE
            </div>
            <p className="text-text-muted text-sm">
              Multi-model AI coding assistant
            </p>
            <div className="flex items-center justify-center gap-2 text-text-muted text-xs mt-4">
              <kbd className="kbd">Ctrl</kbd>
              <span>+</span>
              <kbd className="kbd">K</kbd>
              <span className="ml-1">Command Palette</span>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <MessageBubble message={msg} onFileClick={onFileClick} />
          </motion.div>
        ))}
      </AnimatePresence>

      {loading && (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent-primary typing-dot"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span>Thinking</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

function MessageBubble({
  message,
  onFileClick,
}: {
  message: Message;
  onFileClick: (path: string) => void;
}) {
  const isUser = message.role === "user";
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-accent-primary text-white">
          {message.content}
        </div>
        <div className="w-7 h-7 rounded-lg bg-accent-secondary shrink-0 flex items-center justify-center text-white text-xs font-bold">
          You
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
        BV
      </div>
      <div className="space-y-1 max-w-[85%]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">
            Baanzon Verso
          </span>
          {time && <span className="text-[10px] text-text-muted">{time}</span>}
        </div>
        {message.tool_calls?.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}

        {message.content && (
          <div className="rounded-xl px-4 py-3 text-sm leading-relaxed bg-bg-elevated text-text-primary border border-border-subtle">
            <MarkdownRenderer content={message.content} onFileClick={onFileClick} />
          </div>
        )}
      </div>
    </div>
  );
}
