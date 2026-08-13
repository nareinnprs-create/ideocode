import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Mic, Zap, ListChecks, Bot, Sparkles } from "lucide-react";
import { useChatStore, type ComposerMode } from "../../stores/chatStore";
import { useProviderStore } from "../../stores/providerStore";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";
import { Tooltip } from "../ui/Tooltip";

const MODES: { id: ComposerMode; label: string; icon: typeof Zap; hint: string }[] = [
  { id: "normal", label: "Normal", icon: Zap, hint: "Ask a question" },
  { id: "plan", label: "Plan", icon: ListChecks, hint: "Plan before changing code" },
  { id: "agent", label: "Agent", icon: Bot, hint: "Autonomous multi-step agent" },
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

export function Composer() {
  const [input, setInput] = useState("");
  const [micActive, setMicActive] = useState(false);
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const persistSelection = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const loading = useChatStore((s) => s.loading);
  const streaming = useChatStore((s) => s.streaming);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const model = useChatStore((s) => s.model);
  const setModel = useChatStore((s) => s.setModel);
  const mode = useChatStore((s) => s.mode);
  const setMode = useChatStore((s) => s.setMode);
  const messages = useChatStore((s) => s.messages);
  const providers = useProviderStore((s) => s.providers);
  const loadProviders = useProviderStore((s) => s.loadProviders);

  useEffect(() => {
    loadProviders();
    getSettings()
      .then((s) => {
        if (s.active_model) setModel(s.active_model);
        if (s.mode === "normal" || s.mode === "plan" || s.mode === "agent") {
          setMode(s.mode);
        }
      })
      .catch(() => {});
  }, [loadProviders, setModel, setMode]);

  const persistPatch = (patch: { active_model?: string; mode?: ComposerMode }) => {
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
    await sendMessage(msg);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  return (
    <div className="border-t border-border-subtle bg-bg-secondary p-3 space-y-2 shrink-0">
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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
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

        <button
          onClick={() => void handleSend()}
          disabled={!input.trim() || loading || streaming}
          title="Send message"
          className="p-1.5 rounded-md transition-fast bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed shadow-glow"
        >
          {loading || streaming ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin block" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* Meta row: context + counters */}
      <div className="flex items-center justify-between px-1">
        <span className="flex items-center gap-1 text-[10px] text-text-muted">
          <Sparkles size={10} className="text-accent-primary" />
          Context: session + active file
        </span>
        <span className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
          {inputTokens > 0 && <span>~{inputTokens} tok</span>}
          {userTurns > 0 && <span>Turn {userTurns}</span>}
        </span>
      </div>
    </div>
  );
}
