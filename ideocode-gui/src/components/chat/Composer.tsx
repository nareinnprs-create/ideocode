import { useEffect, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  Zap,
  ListChecks,
  Bot,
  Square,
  FileText,
  Command,
  Scissors,
  Plus,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useChatStore, type ComposerMode } from "../../stores/chatStore";
import { useProviderStore } from "../../stores/providerStore";
import { useFileStore } from "../../stores/fileStore";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import { Tooltip } from "../ui/Tooltip";

const MODES: { id: ComposerMode; label: string; icon: typeof Zap; hint: string }[] = [
  { id: "normal", label: "Ask", icon: Zap, hint: "Ask a question" },
  { id: "plan", label: "Plan", icon: ListChecks, hint: "Plan before changing code" },
  { id: "agent", label: "Agent", icon: Bot, hint: "Autonomous multi-step agent" },
];

const REASONING_LEVELS = [
  { id: "low", label: "Low", hint: "Faster, less thorough reasoning" },
  { id: "medium", label: "Med", hint: "Balanced reasoning depth" },
  { id: "high", label: "High", hint: "Slower, deeper reasoning" },
];

const SLASH_COMMANDS = [
  { id: "plan", label: "Plan mode", hint: "Analyze before writing code", icon: ListChecks },
  { id: "agent", label: "Agent mode", hint: "Autonomous multi-step agent", icon: Bot },
  { id: "compact", label: "Compact conversation", hint: "Summarize older turns", icon: Scissors },
  { id: "clear", label: "New chat", hint: "Start a fresh conversation", icon: Plus },
  { id: "help", label: "Help", hint: "Show usage hints", icon: Command },
];

const HELP_TEXT = `You can use these shortcuts in the composer:
- /plan · /agent — switch chat mode
- /compact — summarize older turns to keep context focused
- /clear — start a new conversation
- @<file> — reference an open file by path
- Enter to send, Shift+Enter for a newline`;

function detectMention(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor);
  const lastSep = Math.max(before.lastIndexOf(" "), before.lastIndexOf("\n"));
  const token = before.slice(lastSep + 1);
  if (token.startsWith("@") && token.length > 1) return token.slice(1);
  return null;
}

function detectSlash(value: string, cursor: number): boolean {
  const before = value.slice(0, cursor);
  return /^\/\w*$/.test(before);
}

export function Composer() {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState<"slash" | "mention" | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selEndRef = useRef(0);
  const persistSelection = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loading = useChatStore((s) => s.loading);
  const streaming = useChatStore((s) => s.streaming);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const interrupt = useChatStore((s) => s.interrupt);
  const compact = useChatStore((s) => s.compact);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const model = useChatStore((s) => s.model);
  const setModel = useChatStore((s) => s.setModel);
  const mode = useChatStore((s) => s.mode);
  const setMode = useChatStore((s) => s.setMode);
  const reasoningEffort = useChatStore((s) => s.reasoningEffort);
  const setReasoningEffort = useChatStore((s) => s.setReasoningEffort);
  const providers = useProviderStore((s) => s.providers);
  const loadProviders = useProviderStore((s) => s.loadProviders);
  const openFiles = useFileStore((s) => s.openFiles);
  const activeFile = useFileStore((s) => s.activeFile);

  useEffect(() => {
    loadProviders();
    getSettings()
      .then((s) => {
        if (s.active_model) setModel(s.active_model);
        if (s.mode === "normal" || s.mode === "plan" || s.mode === "agent") {
          setMode(s.mode);
        }
        if (s.reasoning_effort) setReasoningEffort(s.reasoning_effort);
      })
      .catch(() => {});
  }, [loadProviders, setModel, setMode, setReasoningEffort]);

  const persistPatch = (patch: {
    active_model?: string;
    mode?: ComposerMode;
    reasoning_effort?: string;
  }) => {
    if (persistSelection.current) clearTimeout(persistSelection.current);
    persistSelection.current = setTimeout(() => {
      getSettings()
        .then((s) => updateSettings({ ...s, ...patch }))
        .catch(() => {});
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (persistSelection.current) clearTimeout(persistSelection.current);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading || streaming) return;
    const msg = input;
    setInput("");
    setMenuOpen(null);
    await sendMessage(msg);
    textareaRef.current?.focus();
  };

  const handleChange = (value: string) => {
    setInput(value);
    const cursor = selEndRef.current || value.length;
    const mention = detectMention(value, cursor);
    if (mention !== null) {
      setMenuOpen("mention");
      setMentionQuery(mention);
      setActiveIdx(0);
    } else if (detectSlash(value, cursor)) {
      setMenuOpen("slash");
      setMentionQuery("");
      setActiveIdx(0);
    } else {
      setMenuOpen(null);
    }
  };

  const mentionCandidates = openFiles
    .filter((p) => p.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 6);

  const insertMention = (path: string) => {
    const cursor = selEndRef.current || input.length;
    const before = input.slice(0, cursor);
    const lastSep = Math.max(before.lastIndexOf(" "), before.lastIndexOf("\n"));
    const prefix = before.slice(0, lastSep + 1);
    const after = input.slice(cursor);
    const next = `${prefix}@${path}${after.startsWith(" ") ? "" : " "}${after}`;
    setInput(next);
    setMenuOpen(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const runSlash = (id: string) => {
    setInput("");
    setMenuOpen(null);
    switch (id) {
      case "plan":
        setMode("plan");
        persistPatch({ mode: "plan" });
        break;
      case "agent":
        setMode("agent");
        persistPatch({ mode: "agent" });
        break;
      case "compact":
        void compact();
        break;
      case "clear":
        void clearMessages();
        break;
      case "help":
        setInput(HELP_TEXT);
        break;
    }
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (menuOpen) {
      const list = menuOpen === "slash" ? SLASH_COMMANDS : mentionCandidates;
      if (list.length === 0 && menuOpen === "mention") {
        if (e.key === "Escape") {
          e.preventDefault();
          setMenuOpen(null);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % list.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + list.length) % list.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = list[activeIdx];
        if (item) {
          if (menuOpen === "slash") runSlash((item as { id: string }).id);
          else insertMention(item as string);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(null);
        return;
      }
    }
    if (streaming && e.key === "Escape") {
      e.preventDefault();
      void interrupt();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const activeFileName = activeFile ? activeFile.split(/[/\\]/).pop() : null;

  return (
    <div className="px-3 pb-3 pt-2 shrink-0 relative z-20">
      {/* Slash command palette */}
      {menuOpen === "slash" && (
        <div className="absolute bottom-full left-4 right-4 mb-2 z-30 rounded-lg border border-border-default glass-strong overflow-hidden animate-scale-in">
          {SLASH_COMMANDS.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => runSlash(cmd.id)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-fast ${
                i === activeIdx ? "bg-accent-primary/10" : ""
              }`}
            >
              <cmd.icon size={14} className="text-accent-primary shrink-0" />
              <span className="text-[13px] text-text-primary">{cmd.label}</span>
              <span className="text-xs text-text-muted flex-1 text-right truncate">{cmd.hint}</span>
            </button>
          ))}
        </div>
      )}

      {/* @ mention palette */}
      {menuOpen === "mention" && (
        <div className="absolute bottom-full left-4 right-4 mb-2 z-30 rounded-lg border border-border-default glass-strong overflow-hidden animate-scale-in">
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-text-muted border-b border-border-subtle">
            {mentionCandidates.length === 0 ? "No matching open files" : "Open files"}
          </div>
          {mentionCandidates.map((path, i) => (
            <button
              key={path}
              onClick={() => insertMention(path)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-fast ${
                i === activeIdx ? "bg-accent-primary/10" : ""
              }`}
            >
              <FileText size={14} className="text-text-muted shrink-0" />
              <span className="text-[13px] text-text-primary truncate font-mono">{path}</span>
            </button>
          ))}
        </div>
      )}

      {/* Mode + reasoning row (above composer, Cursor-style) */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1" role="tablist" aria-label="Chat mode">
          {MODES.map(({ id, label, icon: ModeIcon, hint }) => (
            <Tooltip key={id} label={hint}>
              <button
                onClick={() => {
                  setMode(id);
                  persistPatch({ mode: id });
                }}
                aria-pressed={mode === id}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  mode === id
                    ? "bg-accent-primary/12 text-accent-primary glow-soft"
                    : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <ModeIcon size={13} />
                {label}
              </button>
            </Tooltip>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-1" role="group" aria-label="Reasoning effort">
          {REASONING_LEVELS.map(({ id, label, hint }) => (
            <Tooltip key={id} label={`Reasoning: ${hint}`}>
              <button
                onClick={() => {
                  setReasoningEffort(id);
                  persistPatch({ reasoning_effort: id });
                }}
                aria-pressed={reasoningEffort === id}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all duration-150 ${
                  reasoningEffort === id
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                {label}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Composer card */}
      <div
        className={`rounded-xl border bg-bg-secondary/70 backdrop-blur-sm transition-all duration-200 ease-spring ${
          focused
            ? "border-accent-primary/60 shadow-[0_0_0_1px_var(--idc-glow),0_0_28px_-8px_var(--idc-glow),0_2px_8px_-2px_rgba(2,6,23,0.6)]"
            : "border-border-default hover:border-border-strong hover:shadow-raise"
        }`}
      >
        {/* Input row */}
        <div className="flex items-end gap-1 px-1.5 py-1.5">
          <Tooltip label="Attach file">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-text-muted hover:text-text-primary transition-fast rounded-lg hover:bg-bg-hover shrink-0"
            >
              <Paperclip size={16} />
            </button>
          </Tooltip>

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
                  const ext = f.name.includes(".") ? f.name.split(".").pop()! : "";
                  const block = `\n\n<file: ${f.name}>\n\`\`\`${ext}\n${body}\n\`\`\`\n`;
                  setInput((prev) => prev.replace(placeholder, block));
                };
                reader.onerror = () => {
                  setInput((prev) => prev.replace(placeholder, `\n\n[Attached: ${f.name}]\n`));
                };
                reader.readAsText(f);
              }
            }}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => {
              selEndRef.current = e.currentTarget.selectionEnd ?? e.currentTarget.value.length;
              const value = e.currentTarget.value;
              const cursor = selEndRef.current;
              const mention = detectMention(value, cursor);
              if (mention !== null) {
                setMenuOpen("mention");
                setMentionQuery(mention);
              } else if (detectSlash(value, cursor)) {
                setMenuOpen("slash");
              } else if (menuOpen) {
                setMenuOpen(null);
              }
            }}
            onClick={(e) => {
              selEndRef.current = e.currentTarget.selectionEnd ?? e.currentTarget.value.length;
            }}
            onSelect={(e) => {
              selEndRef.current = e.currentTarget.selectionEnd ?? e.currentTarget.value.length;
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask IDEOCODE to build, edit, or explain…"
            rows={1}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none text-sm leading-relaxed max-h-32 py-1.5 px-0.5"
          />

          {streaming ? (
            <Tooltip label="Stop generating (Esc)">
              <button
                onClick={() => void interrupt()}
                title="Stop generating"
                className="w-8 h-8 rounded-lg transition-fast bg-error/15 text-error hover:bg-error/25 flex items-center justify-center shrink-0 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]"
              >
                <Square size={13} className="fill-current" />
              </button>
            </Tooltip>
          ) : (
            <Tooltip label="Send (Enter)">
              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || loading}
                title="Send message"
                className="w-8 h-8 rounded-md accent-gradient-bg text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_4px_14px_-4px_var(--idc-glow)] transition-all duration-150 ease-spring hover:brightness-110 hover:-translate-y-px active:translate-y-0"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </Tooltip>
          )}
        </div>

        {/* Footer row: context + model */}
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
          {activeFileName ? (
            <span className="flex items-center gap-1 min-w-0 text-[11px] text-text-muted">
              <FileText size={11} className="text-text-muted shrink-0" />
              <span className="truncate max-w-40">{activeFileName}</span>
            </span>
          ) : (
            <span className="text-[11px] text-text-muted/70">Ctrl+Shift+P for commands</span>
          )}

          <div className="relative shrink-0">
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                persistPatch({ active_model: e.target.value });
              }}
              aria-label="Select model"
              className="appearance-none bg-transparent border border-transparent rounded-md pl-2 pr-6 py-0.5 text-[11px] font-medium text-text-secondary outline-none hover:border-border-subtle hover:bg-bg-hover focus:border-accent-primary cursor-pointer max-w-44 min-w-0"
            >
              {model === "auto" && <option value="auto">auto</option>}
              {providers
                .flatMap((p) => p.models.map((m) => ({ id: m.id, provider: p.name })))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
            </select>
            <ChevronDown
              size={11}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
