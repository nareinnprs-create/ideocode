import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Copy,
  RefreshCw,
  Pencil,
  Check,
  X,
  ListChecks,
  BookOpen,
  FlaskConical,
  Wrench,
  Sparkles,
  Brain,
} from "lucide-react";
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
    <div className="group relative flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-6 space-y-5 scroll-thin">
        <button
          onClick={() => void clearMessages()}
          title="Start a new chat"
          aria-label="Start a new chat"
          className="absolute top-3 right-3 z-10 btn-icon opacity-0 group-hover:opacity-100 transition-fast bg-bg-secondary/70 border border-border-subtle backdrop-blur"
        >
          <Plus size={14} />
        </button>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-error/10 border border-error/30 text-error text-xs animate-blur-in">
            {error}
          </div>
        )}

        {messages.length === 0 && !loading && <EmptyChat />}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              className="group"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <MessageBubble
                message={msg}
                isLast={i === messages.length - 1}
                isGroupStart={i === 0 || messages[i - 1]?.role !== "assistant"}
                onFileClick={handleFileClick}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && streamingContent && (
          <StreamingBubble content={streamingContent} onFileClick={handleFileClick} />
        )}

        {loading && <AgentReasoningVisualizer />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function AssistantAvatar({ streaming = false }: { streaming?: boolean }) {
  return (
    <div
      className={`w-[18px] h-[18px] rounded-[6px] accent-gradient-bg flex items-center justify-center text-white shrink-0 glow-soft ${
        streaming ? "animate-pulse-glow" : ""
      }`}
    >
      <Sparkles size={10} />
    </div>
  );
}

function AgentReasoningVisualizer() {
  const [expanded, setExpanded] = useState(false);
  const [dots, setDots] = useState("");
  useEffect(() => {
    const int = setInterval(() => setDots(d => d.length > 2 ? "" : d + "."), 500);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="flex flex-col gap-1.5 pl-0.5 animate-blur-in">
      <div 
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setExpanded(!expanded)}
      >
        <AssistantAvatar streaming />
        <span className="text-[13px] text-text-muted font-medium flex items-center gap-1.5">
          <Brain size={14} className="text-accent-primary animate-pulse" />
          Agent Reasoning{dots}
        </span>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden ml-[26px] mt-1"
          >
            <div className="border-l-2 border-border-subtle pl-3 py-1 space-y-1.5">
              <div className="text-[12px] text-text-muted flex items-center gap-2"><Check size={12} className="text-success" /> Parsing Abstract Syntax Tree...</div>
              <div className="text-[12px] text-text-muted flex items-center gap-2"><Check size={12} className="text-success" /> Querying Baanzon Verso Local Engine...</div>
              <div className="text-[12px] text-text-muted flex items-center gap-2 animate-pulse"><Sparkles size={12} className="text-accent-primary" /> Synthesizing thought trace...</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyChat() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const streaming = useChatStore((s) => s.streaming);
  const loading = useChatStore((s) => s.loading);
  const model = useChatStore((s) => s.model);
  const suggestions = [
    {
      label: "Plan a refactor",
      desc: "of the current file",
      prompt: "Plan a refactor of the current file",
      icon: ListChecks,
    },
    {
      label: "Explain the codebase",
      desc: "architecture & flow",
      prompt: "Explain what this codebase does",
      icon: BookOpen,
    },
    {
      label: "Write unit tests",
      desc: "for the current file",
      prompt: "Write unit tests for the current file",
      icon: FlaskConical,
    },
    {
      label: "Fix lint errors",
      desc: "in the current file",
      prompt: "Fix the lint errors in the current file",
      icon: Wrench,
    },
  ];
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-6 animate-blur-in max-w-md px-4 py-8">
        <div className="flex flex-col items-center gap-2.5">
          <AssistantAvatar />
          <h1 className="text-[17px] font-semibold tracking-tight text-text-primary">
            IDEOCODE
          </h1>
          <p className="text-[13px] text-text-muted -mt-1">
            Multi-model AI coding assistant · {model}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {suggestions.map(({ label, desc, prompt, icon: Icon }) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              disabled={streaming || loading}
              className="elevate-hover flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border-subtle bg-bg-secondary/60 text-left hover:border-accent-primary/50 hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon size={15} className="text-accent-primary shrink-0" />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-text-primary truncate">
                  {label}
                </span>
                <span className="block text-[11px] text-text-muted truncate">{desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-text-muted">
          <Kbd>Ctrl</Kbd>
          <span className="opacity-50">+</span>
          <Kbd>Shift</Kbd>
          <span className="opacity-50">+</span>
          <Kbd>P</Kbd>
          <span className="ml-0.5 opacity-70">Command Palette</span>
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 pl-0.5">
        <AssistantAvatar streaming />
        <span className="text-xs font-medium text-text-primary">IDEOCODE</span>
        <span className="text-[11px] text-accent-primary">streaming…</span>
      </div>
      <div className="text-sm leading-relaxed text-text-primary pl-0.5 pr-2">
        <MarkdownRenderer content={content} onFileClick={onFileClick} />
        <Caret />
      </div>
    </div>
  );
}

function Caret() {
  return (
    <span className="inline-block w-[2px] h-[1em] bg-accent-primary ml-0.5 animate-stream rounded-full align-text-bottom shadow-[0_0_8px_var(--idc-glow)]" />
  );
}

function MessageBubble({
  message,
  isLast,
  isGroupStart,
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
  isGroupStart: boolean;
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
      <div className="flex flex-col gap-1">
        {editing ? (
          <div className="w-full max-w-[90%] bg-accent-primary/8 border border-accent-primary/40 rounded-lg p-2">
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
              className="w-full bg-transparent text-text-primary text-sm leading-relaxed resize-none outline-none min-h-[48px]"
            />
            <div className="flex items-center justify-end gap-1 mt-1">
              <button onClick={commitEdit} title="Save edit" className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-fast">
                <Check size={14} />
              </button>
              <button
                onClick={() => {
                  setDraft(message.content);
                  setEditing(false);
                }}
                title="Cancel edit"
                className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-fast"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-text-primary pl-0.5 pr-2 whitespace-pre-wrap">
            {message.content}
          </div>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-fast pl-0.5">
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
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {isGroupStart && (
        <div className="flex items-center gap-2 pl-0.5">
          <AssistantAvatar />
          <span className="text-xs font-medium text-text-primary">IDEOCODE</span>
          {time && <span className="text-[11px] text-text-muted">{time}</span>}
        </div>
      )}

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
        <div className="text-sm leading-relaxed text-text-primary pl-0.5 pr-2">
          <MarkdownRenderer content={message.content} onFileClick={onFileClick} />
          <Checklist content={message.content} />
        </div>
      )}

      {message.usage && (
        <div className="flex items-center gap-3 text-[11px] text-text-muted pl-1">
          <span>{message.usage.total_tokens.toLocaleString()} tokens</span>
          {message.usage.prompt_tokens > 0 && (
            <span>{message.usage.prompt_tokens.toLocaleString()} in</span>
          )}
          {message.usage.completion_tokens > 0 && (
            <span>{message.usage.completion_tokens.toLocaleString()} out</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-fast pl-0.5">
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
  );
}
