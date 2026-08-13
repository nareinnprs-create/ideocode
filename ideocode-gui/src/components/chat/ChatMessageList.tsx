import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Copy, RefreshCw, Pencil, Check, X } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { notify } from "../../stores/toastStore";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallCard } from "./ToolCallCard";
import { Checklist } from "./Checklist";
import { Kbd } from "../ui/Kbd";

export function ChatMessageList() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const streaming = useChatStore((s) => s.streaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const error = useChatStore((s) => s.error);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const openFile = useFileStore((s) => s.openFile);

  const handleFileClick = (path: string) => {
    void openFile(path);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth" });
  }, [messages, loading, streamingContent]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-bg-secondary/60 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={13} className="text-text-muted" />
          <span className="text-xs font-medium text-text-secondary">Chat</span>
          {(loading || streaming) && (
            <span className="text-[10px] text-accent-primary animate-pulse">
              {streaming ? "streaming…" : "responding…"}
            </span>
          )}
        </div>
        <button
          onClick={() => void clearMessages()}
          title="Start a new chat"
          aria-label="Start a new chat"
          className="btn-icon"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="px-3 py-2 rounded bg-error/10 border border-error/30 text-error text-xs animate-blur-in">
            {error}
          </div>
        )}

        {messages.length === 0 && !loading && <EmptyChat />}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              className="group"
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <MessageBubble message={msg} isLast={i === messages.length - 1} onFileClick={handleFileClick} />
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && streamingContent && (
          <StreamingBubble content={streamingContent} onFileClick={handleFileClick} />
        )}

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
    </div>
  );
}

function EmptyChat() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const streaming = useChatStore((s) => s.streaming);
  const loading = useChatStore((s) => s.loading);
  const suggestions = [
    "Plan a refactor of the current file",
    "Explain what this codebase does",
    "Write unit tests for the current file",
    "Fix the lint errors in the current file",
  ];
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3 animate-blur-in">
        <div className="text-4xl font-display font-bold text-gradient">IDEOCODE</div>
        <p className="text-text-muted text-sm">Multi-model AI coding assistant</p>
        <div className="flex items-center justify-center gap-2 text-text-muted text-xs mt-4">
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>Shift</Kbd>
          <span>+</span>
          <Kbd>P</Kbd>
          <span className="ml-1">Command Palette</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto mt-4">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => void sendMessage(s)}
              disabled={streaming || loading}
              className="px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-secondary text-xs text-text-muted hover:text-text-primary hover:border-accent-primary/50 hover:bg-accent-primary/5 transition-fast disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StreamingBubble({
  content,
  onFileClick,
}: {
  content: string;
  onFileClick: (path: string) => void;
}) {
  return (
    <div className="flex justify-start gap-2">
      <AvatarBadge gradient="from-accent-primary to-accent-secondary">BV</AvatarBadge>
      <div className="space-y-1 max-w-[85%]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">Baanzon Verso</span>
          <span className="text-[10px] text-accent-primary">streaming…</span>
        </div>
        <div className="rounded-xl px-4 py-3 text-sm leading-relaxed bg-bg-elevated text-text-primary border border-border-subtle">
          <MarkdownRenderer content={content} onFileClick={onFileClick} />
          <span className="inline-block w-1.5 h-4 bg-accent-primary animate-pulse align-middle ml-0.5 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

function AvatarBadge({
  children,
  gradient,
}: {
  children: string;
  gradient: string;
}) {
  return (
    <div
      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} shrink-0 flex items-center justify-center text-white text-[10px] font-bold shadow-glow`}
    >
      {children}
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
  onFileClick,
}: {
  message: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    tool_calls?: { id: string; name: string; input: string; output?: string; status?: string }[];
    timestamp?: number;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
  isLast: boolean;
  onFileClick: (path: string) => void;
}) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const regenerate = useChatStore((s) => s.regenerate);
  const editLast = useChatStore((s) => s.editLast);
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const copy = () => {
    navigator.clipboard
      .writeText(message.content)
      .then(() => notify("success", "Copied to clipboard", ""))
      .catch(() => notify("error", "Copy failed", ""));
  };

  const commitEdit = () => {
    const content = draft.trim();
    setEditing(false);
    if (content && content !== message.content) {
      void editLast(content);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] flex flex-col items-end gap-1">
          {editing ? (
            <div className="w-full bg-accent-primary/10 border border-accent-primary rounded-xl p-2">
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitEdit();
                  }
                  if (e.key === "Escape") {
                    setDraft(message.content);
                    setEditing(false);
                  }
                }}
                className="w-full bg-transparent text-white text-sm leading-relaxed resize-none outline-none min-h-[48px]"
              />
              <div className="flex items-center justify-end gap-1 mt-1">
                <button onClick={commitEdit} title="Save edit" className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-fast">
                  <Check size={14} />
                </button>
                <button
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(false);
                  }}
                  title="Cancel edit"
                  className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-fast"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-accent-primary text-white">
              {message.content}
            </div>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-fast">
            <button onClick={copy} title="Copy" className="msg-action">
              <Copy size={12} />
            </button>
            {isLast && (
              <button onClick={() => setEditing(true)} title="Edit message" className="msg-action">
                <Pencil size={12} />
              </button>
            )}
          </div>
        </div>
        <AvatarBadge gradient="from-accent-secondary to-accent-tertiary">You</AvatarBadge>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      <AvatarBadge gradient="from-accent-primary to-accent-secondary">BV</AvatarBadge>
      <div className="space-y-1 max-w-[85%]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">Baanzon Verso</span>
          {time && <span className="text-[10px] text-text-muted">{time}</span>}
        </div>
        {message.tool_calls?.map((tc) => (
          <ToolCallCard
            key={tc.id}
            toolCall={{
              id: tc.id,
              name: tc.name,
              input: tc.input,
              output: tc.output,
              status: tc.status,
            }}
          />
        ))}

        {message.content && (
          <div className="rounded-xl px-4 py-3 text-sm leading-relaxed bg-bg-elevated text-text-primary border border-border-subtle">
            <MarkdownRenderer content={message.content} onFileClick={onFileClick} />
            <Checklist content={message.content} />
          </div>
        )}

        {message.usage && (
          <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono">
            <span>{message.usage.total_tokens.toLocaleString()} tokens total</span>
            {message.usage.prompt_tokens > 0 && (
              <span>{message.usage.prompt_tokens.toLocaleString()} in</span>
            )}
            {message.usage.completion_tokens > 0 && (
              <span>{message.usage.completion_tokens.toLocaleString()} out</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-fast">
          <button onClick={copy} title="Copy" className="msg-action">
            <Copy size={12} />
          </button>
          {isLast && (
            <button onClick={() => void regenerate()} title="Regenerate" className="msg-action">
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
