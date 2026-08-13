import { useEffect, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  Mic,
  Zap,
  ListChecks,
  Bot,
  Sparkles,
  Square,
  FileText,
  Command,
  Scissors,
  Plus,
} from "lucide-react";
import { useChatStore, type ComposerMode } from "../../stores/chatStore";
import { useProviderStore } from "../../stores/providerStore";
import { useFileStore } from "../../stores/fileStore";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";
import { Tooltip } from "../ui/Tooltip";

const MODES: { id: ComposerMode; label: string; icon: typeof Zap; hint: string }[] = [
  { id: "normal", label: "Normal", icon: Zap, hint: "Ask a question" },
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
  const [micActive, setMicActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState<"slash" | "mention" | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
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
  const messages = useChatStore((s) => s.messages);
  const providers = useProviderStore((s) => s.providers);
  const loadProviders = useProviderStore((s) => s.loadProviders);
  const openFiles = useFileStore((s) => s.openFiles);

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
      recognitionRef.current?.stop();
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
          else insertMention((item as string));
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

  const handleMicToggle = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => VoiceRecognition;
      webkitSpeechRecognition?: new () => VoiceRecognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      notify("error", "Voice input not supported", "This browser has no SpeechRecognition API.");
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

  const userTurns = messages.filter((m) => m.role === "user").length;
  const inputTokens = Math.round(input.trim().length / 4);
  const activeFile = useFileStore((s) => s.activeFile);
  const activeFileName = activeFile ? activeFile.split(/[/\\]/).pop() : null;

  return (
    <div className="border-t border-border-subtle bg-bg-secondary p-3 space-y-2 shrink-0 relative">
      {/* Slash command palette */}
      {menuOpen === "slash" && (
        <div className="absolute bottom-full left-3 right-3 mb-2 z-30 rounded-lg border border-border-default bg-bg-primary shadow-pop overflow-hidden animate-scale-in">
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
              <span className="text-xs text-text-primary font-mono">{cmd.label}</span>
              <span className="text-[10px] text-text-muted flex-1 text-right truncate">{cmd.hint}</span>
            </button>
          ))}
        </div>
      )}

      {/* @ mention palette */}
      {menuOpen === "mention" && (
        <div className="absolute bottom-full left-3 right-3 mb-2 z-30 rounded-lg border border-border-default bg-bg-primary shadow-pop overflow-hidden animate-scale-in">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-muted border-b border-border-subtle">
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
              <span className="text-xs font-mono text-text-primary truncate">{path}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 bg-bg-primary rounded-lg border border-border-subtle p-0.5">
          {MODES.map(({ id, label, icon: ModeIcon, hint }) => (
            <Tooltip key={id} label={hint}>
              <button
                onClick={() => {
                  setMode(id);
                  persistPatch({ mode: id });
                }}
                aria-pressed={mode === id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-fast ${
                  mode === id ? "bg-accent-primary/15 text-accent-primary" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <ModeIcon size={11} />
                {label}
              </button>
            </Tooltip>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Reasoning effort selector */}
          <div className="flex items-center gap-0.5 bg-bg-primary rounded-lg border border-border-subtle p-0.5">
            {REASONING_LEVELS.map(({ id, label, hint }) => (
              <Tooltip key={id} label={`Reasoning: ${hint}`}>
                <button
                  onClick={() => {
                    setReasoningEffort(id);
                    persistPatch({ reasoning_effort: id });
                  }}
                  aria-pressed={reasoningEffort === id}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-fast ${
                    reasoningEffort === id
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted uppercase tracking-wider hidden sm:inline">Model</span>
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                persistPatch({ active_model: e.target.value });
              }}
              aria-label="Select model"
              className="bg-bg-primary border border-border-subtle rounded-md px-2 py-1 text-[11px] text-text-secondary outline-none focus:border-accent-primary font-mono max-w-[220px]"
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
          </div>
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

        <Tooltip label="Attach file">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-text-muted hover:text-text-primary transition-fast rounded-md hover:bg-bg-elevated"
          >
            <Paperclip size={18} />
          </button>
        </Tooltip>

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
          placeholder="Type a message… (Enter to send, / for commands, @ to reference a file)"
          rows={1}
          className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none text-sm leading-relaxed max-h-32 font-mono"
        />

        <Tooltip label={micActive ? "Stop voice input" : "Voice input"}>
          <button
            onClick={handleMicToggle}
            className={`p-1.5 transition-fast rounded-md hover:bg-bg-elevated ${
              micActive ? "text-accent-primary bg-accent-primary/10" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Mic size={18} />
          </button>
        </Tooltip>

        {streaming ? (
          <Tooltip label="Stop generating (Esc)">
            <button
              onClick={() => void interrupt()}
              title="Stop generating"
              className="p-1.5 rounded-md transition-fast bg-error/15 text-error hover:bg-error/25 animate-pulse-glow"
            >
              <Square size={16} className="fill-current" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            title="Send message"
            className="p-1.5 rounded-md transition-fast bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed shadow-glow"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin block" />
            ) : (
              <Send size={18} />
            )}
          </button>
        )}
      </div>

      {/* Meta row: context + counters */}
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-1 text-[10px] text-text-muted">
          <Sparkles size={10} className="text-accent-primary" />
          {activeFileName ? (
            <>
              Context: session + <span className="font-mono text-text-secondary max-w-40 truncate inline-block align-bottom">{activeFileName}</span>
            </>
          ) : (
            "Context: session"
          )}
        </span>
        <span className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
          {inputTokens > 0 && <span>~{inputTokens} tok</span>}
          {userTurns > 0 && <span>Turn {userTurns}</span>}
        </span>
      </div>
    </div>
  );
}
