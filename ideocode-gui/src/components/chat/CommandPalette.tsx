import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../../stores/appStore";
import { COMMANDS, getCommandsByCategory, type CommandAction } from "../../lib/commands";
import { fuzzySearch } from "../../lib/fuzzy";
import { Search, X, Plus, FolderOpen, Wand2 } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface RankedCommand extends CommandAction {
  score: number;
}

const QUICK_ACTIONS: { label: string; icon: typeof Plus; hint: string; run: () => void }[] = [
  {
    label: "New Chat",
    icon: Plus,
    hint: "⌘N",
    run: () => useAppStore.getState().setCommandPaletteOpen(false),
  },
  {
    label: "Open Workspace",
    icon: FolderOpen,
    hint: "",
    run: () => useAppStore.getState().setRightPanel("files"),
  },
  {
    label: "New Task",
    icon: Wand2,
    hint: "Agent",
    run: () => useAppStore.getState().setCommandPaletteOpen(false),
  },
];

export function CommandPalette() {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    },
    [setCommandPaletteOpen]
  );

  useEffect(() => {
    if (!commandPaletteOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const target = dialog.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? dialog).focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [commandPaletteOpen, handleKeyDown]);

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
  const visibleCount = results.length;

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const el = resultsRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
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
      const cmd = results[selectedIdx];
      if (cmd) executeCommand(cmd);
    }
  };

  const executeCommand = (cmd: CommandAction) => {
    cmd.run();
    setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div
        className="absolute inset-0 bg-surface-overlay/40 backdrop-blur-[2px] animate-fade-in"
        onClick={() => setCommandPaletteOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="relative w-full max-w-xl surface-blur bg-surface-elevated rounded-xl overflow-hidden animate-float-in"
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default hairline-top">
          <Search size={16} className="text-fg-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder="Search commands…"
            className="flex-1 bg-transparent text-fg-primary text-sm outline-none placeholder:text-fg-muted"
            aria-label="Search commands"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-hover"
            aria-label="Close command palette"
          >
            <X size={14} />
          </button>
        </div>

        {/* Quick actions (ZCode-style) */}
        {!query.trim() && (
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border-default bg-transparent">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  a.run();
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-subtle bg-transparent text-xs font-medium text-fg-secondary hover:border-accent/40 hover:text-accent hover:bg-surface-hover transition-all duration-150"
              >
                <a.icon size={13} />
                {a.label}
                {a.hint && (
                  <kbd className="px-1 rounded bg-surface-elevated text-[10px] font-mono text-fg-muted">
                    {a.hint}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div ref={resultsRef} className="max-h-[320px] overflow-y-auto py-1 scroll-thin" role="listbox" aria-label="Commands">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-fg-muted text-sm">
              No commands found
            </div>
          ) : (
            (() => {
              let flatIdx = 0;
              const groups = getCommandsByCategory().filter((g) =>
                g.commands.some((c) => results.some((r) => r.id === c.id)),
              );
              return (
                <>
                  {groups.map((g) => {
                    const groupResults = results.filter((r) => r.category === g.category);
                    if (groupResults.length === 0) return null;
                    return (
                      <div key={g.category}>
                        <div className="px-4 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                          {g.category}
                        </div>
                        {groupResults.map((cmd) => {
                          const Icon = cmd.icon;
                          const idx = flatIdx++;
                          return (
                            <button
                              key={cmd.id}
                              data-idx={idx}
                              role="option"
                              aria-selected={idx === selectedIdx}
                              onClick={() => executeCommand(cmd)}
                              onMouseEnter={() => setSelectedIdx(idx)}
                              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-fast
                                ${
                                  idx === selectedIdx
                                    ? "bg-accent/10 text-accent"
                                    : "text-fg-secondary hover:bg-surface-elevated"
                                }`}
                            >
                              <Icon size={16} className="shrink-0 opacity-50" />
                              <span className="flex-1 text-left">{cmd.label}</span>
                              {cmd.shortcut && (
                                <kbd className="text-[11px] text-fg-muted bg-surface-elevated px-1.5 py-0.5 rounded font-mono border border-border-subtle">
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
      </div>
    </div>
  );
}
