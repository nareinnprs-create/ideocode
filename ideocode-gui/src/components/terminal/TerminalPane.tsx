import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import type { ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Command } from "@tauri-apps/plugin-shell";
import "@xterm/xterm/css/xterm.css";
import { useFileStore } from "../../stores/fileStore";
import { useAppStore } from "../../stores/appStore";
import type { Theme } from "../../lib/theme-registry";
import { getThemeColors } from "../../lib/theme-palettes";

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

export function TerminalPane({ visible }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const rootPath = useFileStore((s) => s.rootPath);
  const rootPathRef = useRef(rootPath);
  const disposedRef = useRef(false);
  const theme = useAppStore((s) => s.theme);
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    rootPathRef.current = rootPath;
  }, [rootPath]);

  useEffect(() => {
    isWindows = navigator.userAgent.includes("Windows");
  }, []);

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

    // Display banner
    term.writeln("\x1b[36mIDEOCODE Terminal\x1b[0m");
    term.writeln("\x1b[36mType commands to execute in the workspace root.\x1b[0m");
    term.writeln("");

    showPrompt(term, rootPathRef.current);

    let currentLine = "";
    let running = false;

    term.onData(async (data) => {
      switch (data) {
        case "\r": { // Enter
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
        case "\x7f": // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write("\b \b");
          }
          break;
        case "\u0003": // Ctrl+C
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

    setTimeout(() => {
      try { fitAddon.fit(); } catch {}
    }, 100);

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
      setTimeout(() => {
        try { fitAddonRef.current?.fit(); } catch {}
      }, 50);
    }
  }, [visible]);

  useEffect(() => {
    const handleResize = () => {
      try { fitAddonRef.current?.fit(); } catch {}
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-9 border-b border-border-subtle bg-bg-secondary">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-xs font-medium text-text-primary">Terminal</span>
        <span className="text-[11px] text-text-muted">
          {rootPath.split(/[/\\]/).pop()}
        </span>
      </div>
      <div
        ref={terminalRef}
        className="flex-1 min-h-0"
        style={{ background: getThemeColors(theme).bg }}
      />
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

    // Subscribe to lifecycle events BEFORE spawn: a fast command (e.g.
    // `echo hi`) can emit "close" before spawn() resolves, and attaching the
    // listeners afterwards would leave this promise pending forever.
    cmd.on("close", () => {
      closed = true;
      resolveFinished();
    });
    cmd.on("error", () => {
      closed = true;
      resolveFinished();
    });

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
