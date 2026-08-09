import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Mic, Zap, ListChecks, Bot, Copy, RefreshCw, Pencil, Check, X, Plus, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { useProviderStore } from "../../stores/providerStore";
import { getSettings } from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";
import { MarkdownRenderer } from "../chat/MarkdownRenderer";
import { ToolCallCard } from "../chat/ToolCallCard";
import { CodeEditor } from "../editor/CodeEditor";
import { TabBar } from "./TabBar";
import type { Message } from "../../lib/tauri-commands";

const MODES = [
  { id: "normal" as const, label: "Normal", icon: Zap },
  { id: "plan" as const, label: "Plan", icon: ListChecks },
  { id: "agent" as const, label: "Agent", icon: Bot },
];

interface VoiceResult {
  [0]: { transcript: string };
}
interface VoiceResultEvent {
  results: VoiceResult[];
}
interface VoiceRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: VoiceResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export function EditorPane() {
  const [input, setInput] = useState("");
  const [micActive, setMicActive] = useState(false);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const { messages, loading, error, sendMessage } = useChatStore();
  const streaming = useChatStore((s) => s.streaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const { activeFile, openFile } = useFileStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const model = useChatStore((s) => s.model);
  const setModel = useChatStore((s) => s.setModel);
  const mode = useChatStore((s) => s.mode);
  const setMode = useChatStore((s) => s.setMode);
  const providers = useProviderStore((s) => s.providers);
  const loadProviders = useProviderStore((s) => s.loadProviders);

  const hasFileSelected = !!activeFile;

  useEffect(() => {
    loadProviders();
    getSettings().then((s) => {
      if (s.active_model) setModel(s.active_model);
    }).catch(() => {});
  }, [loadProviders, setModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading || streaming) return;
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

  const handleMicToggle = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => VoiceRecognition;
      webkitSpeechRecognition?: new () => VoiceRecognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      notify(
        "error",
        "Voice input not supported",
        "This browser has no SpeechRecognition API.",
      );
      return;
    }
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput((prev) => (prev.trim() ? prev + " " + text : text));
    };
    rec.onend = () => setMicActive(false);
    rec.onerror = () => {
      setMicActive(false);
      notify("error", "Voice input failed", "");
    };
    rec.start();
    recognitionRef.current = rec;
    setMicActive(true);
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

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
          <ChatSection
            messages={messages}
            loading={loading}
            streaming={streaming}
            streamingContent={streamingContent}
            error={error}
            messagesEndRef={messagesEndRef}
            onFileClick={handleFileClick}
            onNewChat={() => {
              clearMessages();
              setInput("");
            }}
          />
        </div>
      ) : (
        /* Chat only */
        <ChatSection
          messages={messages}
          loading={loading}
          streaming={streaming}
          streamingContent={streamingContent}
          error={error}
          messagesEndRef={messagesEndRef}
          onFileClick={handleFileClick}
          onNewChat={() => {
            clearMessages();
            setInput("");
          }}
        />
      )}

      {/* Input bar */}
      <div className="border-t border-border-subtle bg-bg-secondary p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 bg-bg-primary rounded-lg border border-border-subtle p-0.5">
            {MODES.map(({ id, label, icon: ModeIcon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                title={`${label} mode`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-fast
                  ${
                    mode === id
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
              >
                <ModeIcon size={11} />
                {label}
              </button>
            ))}
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[11px] text-text-secondary outline-none focus:border-accent-primary font-mono max-w-[220px]"
            >
              {model === "auto" && <option value="auto">auto</option>}
              {providers
                .flatMap((p) =>
                  p.models.map((m) => ({ id: m.id, provider: p.name })),
                )
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-2 glass rounded-xl px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              for (const f of files) {
                const placeholder = `[Attaching ${f.name}...]`;
                setInput((prev) => prev + placeholder);
                const reader = new FileReader();
                reader.onload = () => {
                  let body = String(reader.result ?? "");
                  const MAX = 100_000;
                  if (body.length > MAX) {
                    body = body.slice(0, MAX) + "\n... [truncated]";
                  }
                  const ext = f.name.includes(".")
                    ? f.name.split(".").pop()!
                    : "";
                  const block = `\n\n<file: ${f.name}>\n\`\`\`${ext}\n${body}\n\`\`\`\n`;
                  setInput((prev) => prev.replace(placeholder, block));
                };
                reader.onerror = () => {
                  setInput((prev) =>
                    prev.replace(placeholder, `\n\n[Attached: ${f.name}]\n`),
                  );
                };
                reader.readAsText(f);
              }
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
            onClick={handleMicToggle}
            className={`p-1.5 transition-fast rounded-md hover:bg-bg-elevated ${
              micActive ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Mic size={18} />
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || streaming}
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

function ChatSection({
  messages,
  loading,
  streaming,
  streamingContent,
  error,
  messagesEndRef,
  onFileClick,
  onNewChat,
}: {
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  streamingContent: string;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onFileClick: (path: string) => void;
  onNewChat: () => void;
}) {
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
        <button onClick={onNewChat} title="Start a new chat" className="btn-icon">
          <Plus size={14} />
        </button>
      </div>
      <ChatArea
        messages={messages}
        loading={loading}
        streaming={streaming}
        streamingContent={streamingContent}
        error={error}
        messagesEndRef={messagesEndRef}
        onFileClick={onFileClick}
      />
    </div>
  );
}

function ChatArea({
  messages,
  loading,
  streaming,
  streamingContent,
  error,
  messagesEndRef,
  onFileClick,
}: {
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  streamingContent: string;
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
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            className="group"
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <MessageBubble
              message={msg}
              isLast={i === messages.length - 1}
              onFileClick={onFileClick}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {streaming && streamingContent && (
        <div className="flex justify-start gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
            BV
          </div>
          <div className="space-y-1 max-w-[85%]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-primary">
                Baanzon Verso
              </span>
              <span className="text-[10px] text-accent-primary">streaming…</span>
            </div>
            <div className="rounded-xl px-4 py-3 text-sm leading-relaxed bg-bg-elevated text-text-primary border border-border-subtle">
              <MarkdownRenderer content={streamingContent} onFileClick={onFileClick} />
              <span className="inline-block w-1.5 h-4 bg-accent-primary animate-pulse align-middle ml-0.5 rounded-sm" />
            </div>
          </div>
        </div>
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
  );
}

function MessageBubble({
  message,
  isLast,
  onFileClick,
}: {
  message: Message;
  isLast: boolean;
  onFileClick: (path: string) => void;
}) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const regenerate = useChatStore((s) => s.regenerate);
  const editLast = useChatStore((s) => s.editLast);
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
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
      editLast(content);
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
                <button
                  onClick={commitEdit}
                  title="Save edit"
                  className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-fast"
                >
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
              <button
                onClick={() => setEditing(true)}
                title="Edit message"
                className="msg-action"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
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

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-fast">
          <button onClick={copy} title="Copy" className="msg-action">
            <Copy size={12} />
          </button>
          {isLast && (
            <button onClick={regenerate} title="Regenerate" className="msg-action">
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
