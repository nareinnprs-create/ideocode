import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import { THEMES, type Theme } from "../../lib/theme-registry";
import { COMMANDS, getCommandsByCategory, type CommandAction } from "../../lib/commands";
import { fuzzySearch } from "../../lib/fuzzy";
import { Search, ArrowLeft, Check, X } from "lucide-react";

interface RankedCommand extends CommandAction {
  score: number;
}

export function CommandPalette() {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mode, setMode] = useState<"commands" | "themes">("commands");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const applyTheme = (next: Theme) => {
    setTheme(next);
    void getSettings()
      .then((settings) => updateSettings({ ...settings, theme: next }))
      .catch(() => {});
    setCommandPaletteOpen(false);
  };

  const rankCommands = (): RankedCommand[] => {
    const q = query.trim();
    if (!q) return COMMANDS.map((c) => ({ ...c, score: 0 }));
    const scored: RankedCommand[] = [];
    for (const cmd of COMMANDS) {
      const haystack = [cmd.label, cmd.category, cmd.id, ...(cmd.keywords ?? [])].join(" ");
      const m = fuzzySearch(q, haystack);
      if (m) scored.push({ ...cmd, score: m.score });
    }
    return scored.sort((a, b) => b.score - a.score);
  };

  const results = rankCommands();
  const themes = THEMES.filter((t) =>
    t.label.toLowerCase().includes(query.toLowerCase()),
  );

  const visibleCount = mode === "themes" ? themes.length : results.length;

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIdx(0);
      setMode("commands");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query, mode]);

  useEffect(() => {
    const el = resultsRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, Math.max(visibleCount - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIdx(Math.max(visibleCount - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (mode === "themes") {
        const t = themes[selectedIdx];
        if (t) applyTheme(t.id);
      } else {
        const cmd = results[selectedIdx];
        if (cmd) executeCommand(cmd);
      }
    } else if (e.key === "Escape") {
      if (mode === "themes") {
        setMode("commands");
        setQuery("");
      } else {
        setCommandPaletteOpen(false);
      }
    }
  };

  const executeCommand = (cmd: CommandAction) => {
    if (cmd.id === "change-theme") {
      setMode("themes");
      setQuery("");
      return;
    }
    cmd.run();
    setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setCommandPaletteOpen(false)}
      />

      <div className="relative w-full max-w-lg glass-elevated overflow-hidden animate-slide-up">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          {mode === "themes" && (
            <button
              onClick={() => {
                setMode("commands");
                setQuery("");
              }}
              className="p-1 text-text-muted hover:text-text-primary transition-fast"
              title="Back to commands"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          {mode === "commands" && (
            <Search size={16} className="text-text-muted shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "themes" ? "Search themes..." : "Type a command..."}
            className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-text-muted hover:text-text-primary transition-fast"
          >
            <X size={14} />
          </button>
        </div>

        {mode === "themes" ? (
          <div ref={resultsRef} className="max-h-[300px] overflow-y-auto py-1">
            {themes.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-muted text-sm">
                No themes found
              </div>
            ) : (
              themes.map((t, idx) => {
                const active = t.id === theme;
                return (
                  <button
                    key={t.id}
                    data-idx={idx}
                    onClick={() => applyTheme(t.id)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-fast
                      ${
                        active
                          ? "bg-bg-elevated text-text-primary"
                          : "text-text-secondary hover:bg-bg-elevated"
                      }`}
                  >
                    <span
                      className="w-8 h-6 rounded border border-border-subtle shrink-0 flex items-center justify-center text-[9px] font-mono"
                      style={{ backgroundColor: t.bg, color: t.accent }}
                    >
                      Aa
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block font-medium text-text-primary">
                        {t.label}
                      </span>
                      <span className="block text-[11px] text-text-muted">
                        {t.description} · {t.tier}
                      </span>
                    </span>
                    {active && (
                      <Check size={14} className="text-accent-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div ref={resultsRef} className="max-h-[300px] overflow-y-auto py-1">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-muted text-sm">
                No commands found
              </div>
            ) : (
              (() => {
                let flatIdx = 0;
                const groups = getCommandsByCategory().filter((g) =>
                  g.commands.some((c) =>
                    results.some((r) => r.id === c.id),
                  ),
                );
                return (
                  <>
                    {groups.map((g) => {
                      const groupResults = results.filter((r) => r.category === g.category);
                      if (groupResults.length === 0) return null;
                      return (
                        <div key={g.category}>
                          <div className="px-4 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                            {g.category}
                          </div>
                          {groupResults.map((cmd) => {
                            const Icon = cmd.icon;
                            const idx = flatIdx++;
                            return (
                              <button
                                key={cmd.id}
                                data-idx={idx}
                                onClick={() => executeCommand(cmd)}
                                onMouseEnter={() => setSelectedIdx(idx)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-fast
                                  ${
                                    idx === selectedIdx
                                      ? "bg-bg-elevated text-text-primary"
                                      : "text-text-secondary hover:bg-bg-elevated"
                                  }`}
                              >
                                <Icon size={16} className="shrink-0 opacity-50" />
                                <span className="flex-1 text-left">{cmd.label}</span>
                                {cmd.shortcut && (
                                  <kbd className="text-[11px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded font-mono">
                                    {cmd.shortcut}
                                  </kbd>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
