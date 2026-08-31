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
  GitBranch,
} from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { useFileStore } from "../../stores/fileStore";
import { notify } from "../../stores/toastStore";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallCard } from "./ToolCallCard";
import { Checklist } from "./Checklist";
import { Kbd } from "../ui/Kbd";
import { ForkButton } from "./ForkButton";
import { EditHistoryButton } from "./EditHistoryButton";
import { PermissionPrompt } from "./PermissionPrompt";
import type { Message } from "../../lib/tauri-commands";

export function ChatMessageList() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const streaming = useChatStore((s) => s.streaming);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const error = useChatStore((s) => s.error);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const branches = useChatStore((s) => s.branches);
  const activeBranchId = useChatStore((s) => s.activeBranchId);
  const switchBranch = useChatStore((s) => s.switchBranch);
  const openFile = useFileStore((s) => s.openFile);

  const handleFileClick = (path: string) => {
    void openFile(path);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth" });
  }, [messages, loading, streamingContent]);

  return (
    <div className="group relative flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-6 space-y-5 scroll-thin surface-blur" role="log" aria-label="Chat messages">
        <button
          onClick={() => void clearMessages()}
          title="Start a new chat"
          aria-label="Start a new chat"
          className="absolute top-3 right-3 z-10 btn-icon opacity-0 group-hover:opacity-100 transition-fast bg-surface/70 border border-border-subtle backdrop-blur"
        >
          <Plus size={14} />
        </button>

        {error && (
          <div 
            role="alert"
            aria-live="assertive"
            className="px-3 py-2 rounded-lg bg-error/10 border border-error/30 text-error text-xs animate-blur-in"
          >
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
                messageIndex={i}
                allMessages={messages}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && streamingContent && (
          <div role="log" aria-live="polite" aria-label="AI response streaming">
            <StreamingBubble content={streamingContent} onFileClick={handleFileClick} />
          </div>
        )}

        {loading && <AgentReasoningVisualizer />}

        <PermissionPrompt />

        {branches.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface/60 border border-border-subtle" role="tablist" aria-label="Chat branches">
            <GitBranch size={12} className="text-fg-muted" />
            <span className="text-[11px] text-fg-muted">Branches:</span>
            <button
              onClick={() => switchBranch("")}
              className={`text-[11px] px-1.5 py-0.5 rounded transition-fast ${!activeBranchId ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg-secondary"}`}
            >
              Main
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => switchBranch(b.id)}
                className={`text-[11px] px-1.5 py-0.5 rounded transition-fast ${activeBranchId === b.id ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg-secondary"}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

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
  const streamingContent = useChatStore((s) => s.streamingContent);
  const streaming = useChatStore((s) => s.streaming);
  const loading = useChatStore((s) => s.loading);

  useEffect(() => {
    if (!loading && !streaming) return;
    const int = setInterval(() => setDots(d => d.length > 2 ? "" : d + "."), 500);
    return () => clearInterval(int);
  }, [loading, streaming]);

  const steps: { label: string; status: "done" | "active" | "pending" }[] = [
    { label: "Analyzing request", status: loading && !streaming ? "active" : streaming ? "done" : "pending" },
    { label: "Processing context", status: streaming && !streamingContent ? "active" : streamingContent ? "done" : "pending" },
    { label: "Generating response", status: streaming && !!streamingContent ? "active" : "pending" },
  ];

  return (
    <div className="flex flex-col gap-1.5 pl-0.5 animate-blur-in">
      <div 
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <AssistantAvatar streaming />
        <span className="text-[13px] text-fg-muted font-medium flex items-center gap-1.5">
          <Brain size={14} className="text-accent animate-pulse" />
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
              {steps.map((step) => (
                <div key={step.label} className="text-[12px] text-fg-muted flex items-center gap-2">
                  {step.status === "done" && <Check size={12} className="text-success" />}
                  {step.status === "active" && <Sparkles size={12} className="text-accent animate-pulse" />}
                  {step.status === "pending" && <span className="w-3 h-3 rounded-full border border-border-subtle" />}
                  <span className={step.status === "active" ? "text-fg-primary" : ""}>{step.label}{step.status === "active" ? dots : ""}</span>
                </div>
              ))}
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
          <h1 className="text-[17px] font-semibold tracking-tight text-fg-primary">
            IDEOCODE
          </h1>
          <p className="text-[13px] text-fg-muted -mt-1">
            Multi-model AI coding assistant · {model}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {suggestions.map(({ label, desc, prompt, icon: Icon }) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              disabled={streaming || loading}
              className="elevate-hover flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border-subtle bg-surface/60 text-left hover:border-accent/50 hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon size={15} className="text-accent shrink-0" />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium text-fg-primary truncate">
                  {label}
                </span>
                <span className="block text-[11px] text-fg-muted truncate">{desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-fg-muted">
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
        <span className="text-xs font-medium text-fg-primary">IDEOCODE</span>
        <span className="text-[11px] text-accent">streaming…</span>
      </div>
      <div className="text-sm leading-relaxed text-fg-primary pl-0.5 pr-2">
        <MarkdownRenderer content={content} onFileClick={onFileClick} />
        <Caret />
      </div>
    </div>
  );
}

function Caret() {
  return (
    <span className="inline-block w-[2px] h-[1em] bg-accent ml-0.5 animate-stream rounded-full align-text-bottom shadow-[0_0_8px_var(--idc-glow)]" />
  );
}

function MessageBubble({
  message,
  isLast,
  isGroupStart,
  onFileClick,
  messageIndex,
  allMessages,
}: {
  message: Message;
  isLast: boolean;
  isGroupStart: boolean;
  onFileClick: (path: string) => void;
  messageIndex: number;
  allMessages: Message[];
}) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [showRegenerateMenu, setShowRegenerateMenu] = useState(false);
  const regenerate = useChatStore((s) => s.regenerate);
  const createBranch = useChatStore((s) => s.createBranch);
  const editLast = useChatStore((s) => s.editLast);
  const undoAssistantChanges = useChatStore((s) => s.undoAssistantChanges);
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
          <div className="w-full max-w-[90%] bg-accent/8 border border-accent/40 rounded-lg p-2">
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
              className="w-full bg-transparent text-fg-primary text-sm leading-relaxed resize-none outline-none min-h-[48px]"
            />
            <div className="flex items-center justify-end gap-1 mt-1">
              <button onClick={commitEdit} title="Save edit" aria-label="Save edit" className="p-1 rounded text-fg-secondary hover:text-fg-primary hover:bg-surface-hover transition-fast">
                <Check size={14} />
              </button>
              <button
                onClick={() => {
                  setDraft(message.content);
                  setEditing(false);
                }}
                title="Cancel edit"
                aria-label="Cancel edit"
                className="p-1 rounded text-fg-secondary hover:text-fg-primary hover:bg-surface-hover transition-fast"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-fg-primary pl-0.5 pr-2 whitespace-pre-wrap">
            {message.content}
          </div>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-fast pl-0.5">
          <button onClick={copy} title="Copy" aria-label="Copy message" className="msg-action">
            <Copy size={12} />
          </button>
          <EditHistoryButton messageId={message.id} role="user" />
          {isLast && (
            <button onClick={() => setEditing(true)} title="Edit message" aria-label="Edit message" className="msg-action">
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
          <span className="text-xs font-medium text-fg-primary">IDEOCODE</span>
          {time && <span className="text-[11px] text-fg-muted">{time}</span>}
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
        <div className="text-sm leading-relaxed text-fg-primary pl-0.5 pr-2">
          <MarkdownRenderer content={message.content} onFileClick={onFileClick} />
          <Checklist content={message.content} />
        </div>
      )}

      {message.usage && (
        <div className="flex items-center gap-3 text-[11px] text-fg-muted pl-1">
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
        <button onClick={copy} title="Copy" aria-label="Copy message" className="msg-action">
          <Copy size={12} />
        </button>
        <ForkButton messageId={message.id} messageIndex={messageIndex} messages={allMessages} />
        <EditHistoryButton messageId={message.id} role="assistant" onUndo={() => void undoAssistantChanges(message.id)} />
        {isLast && (
          <>
            <button onClick={() => { createBranch(); }} title="Create branch" aria-label="Create branch" className="msg-action">
              <GitBranch size={12} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowRegenerateMenu(!showRegenerateMenu)}
                title="Regenerate"
                aria-label="Regenerate response"
                className="msg-action"
              >
                <RefreshCw size={12} />
              </button>
              {showRegenerateMenu && (
                <div className="absolute bottom-full right-0 mb-1 z-50 min-w-[120px] py-1 rounded-lg border border-border-subtle bg-surface shadow-xl animate-fade-in">
                  <button
                    onClick={() => { void regenerate(); setShowRegenerateMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-fg-secondary hover:bg-accent/10 hover:text-accent transition-fast"
                  >
                    <RefreshCw size={11} />
                    Same model
                  </button>
                  <button
                    onClick={() => { void regenerate("gpt-4o"); setShowRegenerateMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-fg-secondary hover:bg-accent/10 hover:text-accent transition-fast"
                  >
                    <Sparkles size={11} />
                    GPT-4o
                  </button>
                  <button
                    onClick={() => { void regenerate("claude-sonnet-4-20250514"); setShowRegenerateMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-fg-secondary hover:bg-accent/10 hover:text-accent transition-fast"
                  >
                    <Sparkles size={11} />
                    Claude Sonnet
                  </button>
                  <button
                    onClick={() => { void regenerate("gemini-2.5-flash"); setShowRegenerateMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-fg-secondary hover:bg-accent/10 hover:text-accent transition-fast"
                  >
                    <Sparkles size={11} />
                    Gemini 2.5 Flash
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
