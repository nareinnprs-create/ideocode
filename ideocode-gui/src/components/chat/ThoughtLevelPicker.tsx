import { useEffect, useRef, useState } from "react";
import { Zap, Brain, Sparkles } from "lucide-react";
import { useChatStore, type ThoughtLevel } from "../../stores/chatStore";
import { Tooltip } from "../ui/Tooltip";

const LEVELS: { id: ThoughtLevel; label: string; icon: typeof Zap; hint: string }[] = [
  { id: "low", label: "Low", icon: Zap, hint: "Fast, minimal reasoning" },
  { id: "high", label: "High", icon: Brain, hint: "Deep, thorough reasoning" },
  { id: "max", label: "Max", icon: Sparkles, hint: "Maximum reasoning depth" },
];

const LEVEL_ICONS: Record<ThoughtLevel, typeof Zap> = {
  low: Zap,
  high: Brain,
  max: Sparkles,
};

const LEVEL_LABELS: Record<ThoughtLevel, string> = {
  low: "Low",
  high: "High",
  max: "Max",
};

export function ThoughtLevelPicker() {
  const thoughtLevel = useChatStore((s) => s.thoughtLevel);
  const setThoughtLevel = useChatStore((s) => s.setThoughtLevel);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const CurrentIcon = LEVEL_ICONS[thoughtLevel];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        const idx = LEVELS.findIndex((l) => l.id === thoughtLevel);
        const next = LEVELS[(idx + 1) % LEVELS.length];
        setThoughtLevel(next.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [thoughtLevel, setThoughtLevel]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip label={`Thought level: ${LEVEL_LABELS[thoughtLevel]} (Ctrl+T to cycle)`}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-all duration-150"
        >
          <CurrentIcon size={13} />
          {LEVEL_LABELS[thoughtLevel]}
        </button>
      </Tooltip>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 z-30 min-w-[120px] py-1 rounded-lg border border-border-subtle bg-bg-secondary shadow-xl animate-scale-in">
          {LEVELS.map(({ id, label, icon: LevelIcon, hint }) => (
            <button
              key={id}
              onClick={() => {
                setThoughtLevel(id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-fast ${
                thoughtLevel === id
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <LevelIcon size={13} className="shrink-0" />
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[10px] text-text-muted flex-1 text-right truncate">{hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
