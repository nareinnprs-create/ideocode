import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Command } from "@tauri-apps/plugin-shell";
import "@xterm/xterm/css/xterm.css";
import { useFileStore } from "../../stores/fileStore";

interface Props {
  visible: boolean;
}

let isWindows: boolean | null = null;

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

  useEffect(() => {
    isWindows = navigator.userAgent.includes("Windows");
  }, []);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#0a0a0f",
        foreground: "#e8e8f0",
        cursor: "#6366f1",
        selectionBackground: "#6366f140",
        black: "#000000",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#f59e0b",
        blue: "#6366f1",
        magenta: "#a78bfa",
        cyan: "#22d3ee",
        white: "#e8e8f0",
        brightBlack: "#6a6a82",
        brightRed: "#ef4444",
        brightGreen: "#22c55e",
        brightYellow: "#f59e0b",
        brightBlue: "#818cf8",
        brightMagenta: "#c4b5fd",
        brightCyan: "#67e8f9",
        brightWhite: "#f8f8ff",
      },
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

    showPrompt(term, rootPath);

    let currentLine = "";

    term.onData(async (data) => {
      switch (data) {
        case "\r": { // Enter
          term.writeln("");
          const trimmed = currentLine.trim();
          if (trimmed) {
            await runCommand(term, rootPath, trimmed);
          }
          currentLine = "";
          showPrompt(term, rootPath);
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
          showPrompt(term, rootPath);
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
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

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
        <span className="text-[10px] text-text-muted">
          {rootPath.split(/[/\\]/).pop()}
        </span>
      </div>
      <div
        ref={terminalRef}
        className="flex-1 min-h-0"
        style={{ background: "#0a0a0f" }}
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
  cwd: string,
  input: string,
) {
  const [shell, shellArgs] = getShell();
  const args = [...shellArgs, input];

  try {
    const cmd = Command.create(shell, args, { cwd });

    let closed = false;

    cmd.stdout.on("data", (line: string) => {
      if (!closed) term.write(line);
    });

    cmd.stderr.on("data", (line: string) => {
      if (!closed) term.write(`\x1b[91m${line}\x1b[0m`);
    });

    await cmd.spawn();

    await new Promise<void>((resolve) => {
      cmd.on("close", () => {
        closed = true;
        resolve();
      });
      cmd.on("error", () => {
        closed = true;
        resolve();
      });
    });
  } catch (e) {
    term.writeln(`\x1b[91mError: ${e}\x1b[0m`);
  }
}
