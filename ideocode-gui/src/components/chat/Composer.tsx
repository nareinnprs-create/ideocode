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
  Mic,
} from "lucide-react";
import { useChatStore, type ComposerMode } from "../../stores/chatStore";
import { useProviderStore } from "../../stores/providerStore";
import { useFileStore } from "../../stores/fileStore";
import { useGoalStore } from "../../stores/goalStore";
import { getSettings, updateSettings, searchFiles } from "../../lib/tauri-commands";
import { Tooltip } from "../ui/Tooltip";
import { ExecutionModePicker } from "./ExecutionModePicker";
import { ThoughtLevelPicker } from "./ThoughtLevelPicker";
import { CommandAutocomplete } from "./CommandAutocomplete";
import { GoalCommandHandler } from "./GoalCommandHandler";

const MODES: { id: ComposerMode; label: string; icon: typeof Zap; hint: string }[] = [
  { id: "normal", label: "Ask", icon: Zap, hint: "Ask a question" },
  { id: "plan", label: "Plan", icon: ListChecks, hint: "Plan before changing code" },
  { id: "agent", label: "Agent", icon: Bot, hint: "Autonomous multi-step agent" },
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

import { notify } from "../../stores/toastStore";
export function Composer() {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState<"slash" | "mention" | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCandidates, setMentionCandidates] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const [tabs, setTabs] = useState([{ id: "tab-1", label: "Chat 1" }]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [tabInputs, setTabInputs] = useState<Map<string, string>>(new Map([["tab-1", ""]]));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selEndRef = useRef(0);
  const persistSelection = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

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
  const setReasoningEffort = useChatStore((s) => s.setReasoningEffort);
  const providers = useProviderStore((s) => s.providers);
  const loadProviders = useProviderStore((s) => s.loadProviders);
  const openFiles = useFileStore((s) => s.openFiles);
  const activeFile = useFileStore((s) => s.activeFile);
  const rootPath = useFileStore((s) => s.rootPath);
  const goalStore = useGoalStore();

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
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  useEffect(() => {
    // @ts-expect-error — webkitSpeechRecognition is a non-standard API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => prev + (prev ? " " : "") + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        notify("error", "Dictation error", event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      notify("error", "Voice Dictation", "Speech Recognition API not supported in this browser");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        notify("error", "Voice Dictation", String(e));
      }
    }
  };

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

  useEffect(() => {
    if (menuOpen === "mention" && rootPath) {
      if (mentionQuery.length === 0) {
        setMentionCandidates(openFiles.slice(0, 6));
        return;
      }
      const delay = setTimeout(() => {
        searchFiles(mentionQuery, rootPath)
          .then((res) => {
            const matches = res.map((r) => r.file).slice(0, 8);
            setMentionCandidates(matches);
          })
          .catch(() => {
            // fallback to open files if search fails
            setMentionCandidates(
              openFiles.filter((p) => p.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
            );
          });
      }, 150);
      return () => clearTimeout(delay);
    }
  }, [mentionQuery, menuOpen, rootPath, openFiles]);

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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();
    for (const item of imageItems) {
      const blob = item.getAsFile();
      if (!blob) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        const placeholder = `[Pasting image: ${blob.name || "clipboard"}...]`;
        setInput((prev) => prev + placeholder);
        const block = `\n\n<image: ${blob.name || "clipboard.png"}>\n${dataUrl}\n`;
        setInput((prev) => prev.replace(placeholder, block));
      };
      reader.readAsDataURL(blob);
    }
  };

  const activeFileName = activeFile ? activeFile.split(/[/\\]/).pop() : null;

  return (
    <div className="px-3 pb-3 pt-2 shrink-0 relative z-20">
      {/* Slash command palette */}
      {menuOpen === "slash" && (
        <CommandAutocomplete
          input={input}
          onSelect={(cmd, args) => {
            setInput("");
            setMenuOpen(null);
            if (cmd === "goal" && args) {
              goalStore.setGoal(args);
            } else if (cmd === "compact") {
              void compact();
            } else if (cmd === "clear") {
              void clearMessages();
            } else {
              runSlash(cmd);
            }
            textareaRef.current?.focus();
          }}
          onClose={() => setMenuOpen(null)}
        />
      )}

      {menuOpen === "slash" && input.startsWith("/goal") && (
        <GoalCommandHandler
          input={input}
          onCommand={(action, args) => {
            setInput("");
            setMenuOpen(null);
            switch (action) {
              case "set":
                if (args) goalStore.setGoal(args);
                break;
              case "pause":
                goalStore.pauseGoal();
                break;
              case "resume":
                goalStore.startGoal();
                break;
              case "clear":
                goalStore.clearGoal();
                break;
              case "replace":
                if (args) goalStore.setGoal(args);
                break;
            }
            textareaRef.current?.focus();
          }}
        />
      )}

      {/* @ mention palette */}
      {menuOpen === "mention" && (
        <div className="absolute bottom-full left-4 right-4 mb-2 z-30 rounded-lg border border-border-default glass-strong overflow-hidden animate-scale-in">
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-text-muted border-b border-border-subtle">
            {mentionCandidates.length === 0 ? "No matching files" : (mentionQuery ? "Codebase files" : "Open files")}
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

      {/* Tab bar header */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none border-b border-border-subtle mb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setTabInputs((prev) => {
                const next = new Map(prev);
                next.set(activeTabId, input);
                return next;
              });
              setInput(tabInputs.get(tab.id) ?? "");
              setActiveTabId(tab.id);
            }}
            className={`px-3 py-1 text-xs font-medium rounded-t-md border-b-2 transition-all ${
              activeTabId === tab.id
                ? "border-accent-primary text-text-primary bg-bg-secondary/50"
                : "border-transparent text-text-muted hover:text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => {
            setTabInputs((prev) => {
              const next = new Map(prev);
              next.set(activeTabId, input);
              return next;
            });
            const newId = `tab-${tabs.length + 1}`;
            setTabs([...tabs, { id: newId, label: `Chat ${tabs.length + 1}` }]);
            setActiveTabId(newId);
            setInput("");
          }}
          className="ml-1 p-1 text-text-muted hover:text-text-primary rounded hover:bg-bg-hover"
          aria-label="New Chat Tab"
        >
          <Plus size={14} />
        </button>
      </div>

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
          <span className="w-px h-4 bg-border-subtle mx-1" />
          <ExecutionModePicker />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={model}
            onChange={(e) => {
              const newModel = e.target.value;
              setModel(newModel);
              persistPatch({ active_model: newModel });
              const p = providers.find(prov => prov.models.some(m => m.id === newModel));
              if (p) {
                useProviderStore.getState().setActiveProvider(p.id, newModel);
              }
            }}
            className="bg-transparent text-text-muted hover:text-text-primary text-[11px] outline-none cursor-pointer border border-transparent hover:border-border-subtle rounded px-1 py-0.5 transition-fast max-w-[130px] truncate appearance-none"
            aria-label="Select AI Model"
          >
            <option value="auto">Auto (Default)</option>
            {providers.map(p => (
              <optgroup key={p.id} label={p.name}>
                {p.models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="hidden sm:flex items-center">
            <ThoughtLevelPicker />
          </div>
        </div>
      </div>

      {/* Composer card */}
      <div
        className={`rounded-xl border bg-bg-secondary shadow-[0_1px_2px_rgba(24,27,39,0.04),0_4px_16px_-8px_rgba(24,27,39,0.08)] transition-all duration-200 ease-spring ${
          focused
            ? "border-accent-primary/50 shadow-[0_0_0_1px_var(--idc-glow),0_0_28px_-8px_var(--idc-glow),0_2px_8px_-2px_rgba(24,27,39,0.12)]"
            : "border-border-default hover:border-border-strong hover:shadow-raise"
        }`}
      >
        {/* Input row */}
        <div className="flex items-end gap-1 px-1.5 py-1.5">
          <Tooltip label="Attach file">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-text-muted hover:text-text-primary transition-fast rounded-lg hover:bg-bg-hover shrink-0"
              aria-label="Attach file"
            >
              <Paperclip size={16} />
            </button>
          </Tooltip>
          <Tooltip label={isRecording ? "Stop dictation" : "Start Voice Dictation"}>
            <button
              className={`p-2 transition-fast rounded-lg shrink-0 ${
                isRecording 
                  ? "text-error bg-error/10 hover:bg-error/20 animate-pulse" 
                  : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
              }`}
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop dictation" : "Start voice dictation"}
            >
              <Mic size={16} />
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
            onPaste={handlePaste}
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
            aria-label="Chat message"
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none text-sm leading-relaxed max-h-32 py-1.5 px-0.5"
          />

          {streaming ? (
            <Tooltip label="Stop generating (Esc)">
              <button
                onClick={() => void interrupt()}
                title="Stop generating"
                aria-label="Stop generating"
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
                aria-label="Send message"
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
                const newModel = e.target.value;
                setModel(newModel);
                persistPatch({ active_model: newModel });
                const p = providers.find(prov => prov.models.some(m => m.id === newModel));
                if (p) {
                  useProviderStore.getState().setActiveProvider(p.id, newModel);
                }
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
