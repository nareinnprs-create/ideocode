import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import type { ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Command } from "@tauri-apps/plugin-shell";
import "@xterm/xterm/css/xterm.css";
import { useFileStore } from "../../stores/fileStore";
import { useAppStore } from "../../stores/appStore";
import { useTerminalStore, type TerminalInstance } from "../../stores/terminalStore";
import type { Theme } from "../../lib/theme-registry";
import { getThemeColors } from "../../lib/theme-palettes";
import { Plus, X, Search } from "lucide-react";

interface Props {
  visible: boolean;
}

let isWindows: boolean | null = null;

function hex8ToRgba(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const a = parseInt(m[4], 16) / 255;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

function xtermTheme(themeId: Theme): ITheme {
  const c = getThemeColors(themeId);
  return {
    background: c.bg,
    foreground: c.fg,
    cursor: c.accent,
    cursorAccent: c.bg,
    selectionBackground: hex8ToRgba(c.selection),
    black: "#000000",
    red: c.error,
    green: c.success,
    yellow: c.warning,
    blue: c.accent,
    magenta: c.accentSecondary,
    cyan: c.info,
    white: c.fg,
    brightBlack: c.textMuted,
    brightRed: c.error,
    brightGreen: c.success,
    brightYellow: c.warning,
    brightBlue: c.accentSecondary,
    brightMagenta: c.accentTertiary,
    brightCyan: c.info,
    brightWhite: c.fg,
  };
}

function getShell(): [string, string[]] {
  if (isWindows === true) {
    return ["cmd", ["/C"]];
  }
  return ["sh", ["-c"]];
}

function SingleTerminal({
  instance: _instance,
  visible,
  isPaused: _isPaused,
}: {
  instance: TerminalInstance;
  visible: boolean;
  isPaused: boolean;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const rootPath = useFileStore((s) => s.rootPath);
  const rootPathRef = useRef(rootPath);
  const disposedRef = useRef(false);
  const theme = useAppStore((s) => s.theme);
  const themeRef = useRef(theme);

  useEffect(() => { themeRef.current = theme; }, [theme]);
  useEffect(() => { rootPathRef.current = rootPath; }, [rootPath]);
  useEffect(() => { isWindows = navigator.userAgent.includes("Windows"); }, []);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      theme: xtermTheme(themeRef.current),
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      cursorBlink: true,
      cursorStyle: "bar",
      allowTransparency: true,
      rows: 20,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(terminalRef.current);
    term.writeln("\x1b[36mIDEOCODE Terminal\x1b[0m");
    term.writeln("\x1b[36mType commands to execute in the workspace root.\x1b[0m");
    term.writeln("");
    showPrompt(term, rootPathRef.current);

    let currentLine = "";
    let running = false;

    term.onData(async (data) => {
      switch (data) {
        case "\r": {
          term.writeln("");
          const trimmed = currentLine.trim();
          if (trimmed && !running) {
            running = true;
            await runCommand(term, rootPathRef, disposedRef, trimmed);
            running = false;
          }
          currentLine = "";
          showPrompt(term, rootPathRef.current);
          break;
        }
        case "\x7f":
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write("\b \b");
          }
          break;
        case "\u0003":
          currentLine = "";
          term.writeln("^C");
          showPrompt(term, rootPathRef.current);
          break;
        default:
          if (!data.startsWith("\x1b")) {
            currentLine += data;
            term.write(data);
          }
          break;
      }
    });

    xtermRef.current = term;
    setTimeout(() => { try { fitAddon.fit(); } catch {} }, 100);

    return () => {
      disposedRef.current = true;
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = xtermTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => { try { fitAddonRef.current?.fit(); } catch {} }, 50);
    }
  }, [visible]);

  useEffect(() => {
    const handleResize = () => { try { fitAddonRef.current?.fit(); } catch {} };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={terminalRef}
      className="flex-1 min-h-0"
      style={{ background: getThemeColors(theme).bg }}
    />
  );
}

export function TerminalPane({ visible }: Props) {
  const terminals = useTerminalStore((s) => s.terminals);
  const activeId = useTerminalStore((s) => s.activeTerminalId);
  const addTerminal = useTerminalStore((s) => s.addTerminal);
  const removeTerminal = useTerminalStore((s) => s.removeTerminal);
  const setActive = useTerminalStore((s) => s.setActiveTerminal);
  const renameTerminal = useTerminalStore((s) => s.renameTerminal);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminals.length === 0) {
      addTerminal();
    }
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameTerminal(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center h-9 border-b border-border-subtle surface-blur bg-surface/60 px-2 gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto scroll-thin">
          {terminals.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium cursor-pointer transition-all shrink-0
                ${t.id === activeId
                  ? "bg-surface-hover text-fg-primary"
                  : "text-fg-muted hover:text-fg-secondary hover:bg-surface-hover"
                }`}
              onClick={() => setActive(t.id)}
              onDoubleClick={() => startRename(t.id, t.name)}
            >
              {editingId === t.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-20 bg-transparent text-fg-primary text-xs outline-none border-b border-accent"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate max-w-24">{t.name}</span>
              )}
              {terminals.length > 1 && editingId !== t.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTerminal(t.id);
                  }}
                  className="p-0.5 rounded text-fg-muted hover:text-fg-primary hover:bg-surface-elevated opacity-0 group-hover:opacity-100 transition-fast"
                  title="Close terminal"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-1 rounded text-fg-muted hover:text-fg-primary hover:bg-surface-hover transition-fast"
            title="Search in terminal"
          >
            <Search size={13} />
          </button>
          <button
            onClick={() => addTerminal()}
            className="p-1 rounded text-fg-muted hover:text-fg-primary hover:bg-surface-hover transition-fast"
            title="New terminal"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 h-8 border-b border-border-subtle bg-surface">
          <Search size={12} className="text-fg-muted shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terminal output…"
            className="flex-1 bg-transparent text-fg-primary text-xs outline-none placeholder:text-fg-muted"
          />
          <button
            onClick={() => setSearchOpen(false)}
            className="p-0.5 text-fg-muted hover:text-fg-primary transition-fast"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Terminal content */}
      <div className="flex-1 min-h-0 relative">
        {terminals.map((t) => (
          <div
            key={t.id}
            className={`absolute inset-0 ${t.id === activeId ? "" : "hidden"}`}
          >
            <SingleTerminal instance={t} visible={visible && t.id === activeId} isPaused={t.id !== activeId} />
          </div>
        ))}
      </div>
    </div>
  );
}

function showPrompt(term: Terminal, cwd: string) {
  const dir = cwd.split(/[/\\]/).pop() ?? "~";
  term.write(`\r\n\x1b[92m${dir}\x1b[0m \x1b[94m$\x1b[0m `);
}

async function runCommand(
  term: Terminal,
  rootPathRef: React.RefObject<string>,
  disposedRef: React.MutableRefObject<boolean>,
  input: string,
) {
  const cwd = rootPathRef.current;
  const [shell, shellArgs] = getShell();
  const args = [...shellArgs, input];

  let closed = false;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((resolve) => {
    resolveFinished = resolve;
  });

  try {
    const cmd = Command.create(shell, args, cwd ? { cwd } : {});
    cmd.on("close", () => { closed = true; resolveFinished(); });
    cmd.on("error", () => { closed = true; resolveFinished(); });
    cmd.stdout.on("data", (line: string) => {
      if (!closed && !disposedRef.current) term.write(line);
    });
    cmd.stderr.on("data", (line: string) => {
      if (!closed && !disposedRef.current) term.write(`\x1b[91m${line}\x1b[0m`);
    });
    await cmd.spawn();
    await finished;
  } catch (e) {
    closed = true;
    resolveFinished();
    if (!disposedRef.current) {
      term.writeln(`\x1b[91mError: ${e}\x1b[0m`);
    }
  }
}
