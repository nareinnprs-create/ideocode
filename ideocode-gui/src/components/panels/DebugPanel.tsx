import { useEffect, useRef, useState } from "react";
import { BugPlay, ArrowDown, ArrowRight, ArrowUp, RotateCcw, Square, Loader2 } from "lucide-react";
import { Command, type Child } from "@tauri-apps/plugin-shell";
import { fileExists } from "../../lib/tauri-commands";
import { useFileStore } from "../../stores/fileStore";
import { notify } from "../../stores/toastStore";

type RunKind = "cargo" | "npm" | null;
type ProcessState = "idle" | "running" | "exited";

interface ProcessResult {
  state: ProcessState;
  code: number | null;
  error: string | null;
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
}

export function DebugPanel() {
  const rootPath = useFileStore((s) => s.rootPath);
  const [runKind, setRunKind] = useState<RunKind>(null);
  const [detecting, setDetecting] = useState(true);
  const [lines, setLines] = useState<string[]>([]);
  const [proc, setProc] = useState<ProcessResult>({ state: "idle", code: null, error: null });
  const childRef = useRef<Child | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setDetecting(true);
      try {
        if (rootPath) {
          const [isCargo, isNpm] = await Promise.all([
            fileExists(rootPath.replace(/[/\\]$/, "") + "/Cargo.toml"),
            fileExists(rootPath.replace(/[/\\]$/, "") + "/package.json"),
          ]);
          if (active) setRunKind(isCargo ? "cargo" : isNpm ? "npm" : null);
        } else {
          if (active) setRunKind(null);
        }
      } catch {
        if (active) setRunKind(null);
      }
      if (active) setDetecting(false);
    })();
    return () => {
      active = false;
    };
  }, [rootPath]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    return () => {
      childRef.current?.kill().catch(() => {});
    };
  }, []);

  const appendOutput = (text: string) => {
    if (!text) return;
    setLines((prev) => [...prev, ...stripAnsi(text).split("\n")].slice(-2000));
  };

  const stop = async () => {
    if (childRef.current) {
      try {
        await childRef.current.kill();
      } catch {
        // already exited
      }
      childRef.current = null;
    }
    setProc((p) => ({ ...p, state: "idle" }));
  };

  const start = async (restart = false) => {
    if (!rootPath) {
      notify("warning", "No project path", "Set a project path in the File Explorer first");
      return;
    }
    if (!runKind) {
      notify("warning", "No runnable project", "No Cargo.toml or package.json found in the project root");
      return;
    }

    if (restart) await stop();
    if (childRef.current) return;

    const command = runKind === "cargo" ? "cargo" : "npm";
    const args = runKind === "cargo" ? ["run"] : ["run", "dev"];
    const label = `${command} ${args.join(" ")}`;

    setLines((prev) => [...prev, "", `$ ${label}  (${rootPath})`]);
    setProc({ state: "running", code: null, error: null });
    startedRef.current = Date.now();
    notify("info", `Running ${label}`);

    const child = Command.create(command, args, { cwd: rootPath });

    let settled = false;
    const settle = (state: "exited" | "idle", code: number | null, error: string | null) => {
      if (settled) return;
      settled = true;
      childRef.current = null;
      if (state === "exited") {
        const elapsed = Math.round((Date.now() - startedRef.current) / 1000);
        setLines((prev) => [...prev, `Process exited with code ${code} (${elapsed}s)`]);
        notify(
          code === 0 ? "success" : "error",
          code === 0 ? `${label} finished` : `${label} exited with code ${code}`,
        );
      }
      setProc({ state, code, error });
    };

    child.on("close", (data) => {
      settle("exited", data.code, null);
    });
    child.on("error", (data) => {
      appendOutput(data);
      settle("idle", null, String(data));
    });
    child.stdout.on("data", (data: string) => appendOutput(data));
    child.stderr.on("data", (data: string) => appendOutput(data));

    try {
      const spawned = await child.spawn();
      if (!settled) childRef.current = spawned;
    } catch (e) {
      settle("idle", null, `${e}`);
      setProc({ state: "idle", code: null, error: `${e}` });
      notify("error", `Failed to start ${label}`, `${e}`);
    }
  };

  const running = proc.state === "running";
  const title = runKind === "cargo" ? "Cargo run" : runKind === "npm" ? "npm run dev" : "No runnable project";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border-subtle">
        <button
          title={running ? "Stop the running process" : "Start the project"}
          onClick={() => (running ? stop() : start(false))}
          disabled={detecting || (!runKind && !running)}
          className="p-1.5 text-text-muted disabled:opacity-25 enabled:hover:bg-bg-elevated transition-fast rounded"
        >
          {running ? <Square size={14} /> : <BugPlay size={14} />}
        </button>
        <button
          title="Restart the project"
          onClick={() => start(true)}
          disabled={running || detecting || !runKind}
          className="p-1.5 text-text-muted disabled:opacity-25 enabled:hover:bg-bg-elevated transition-fast rounded"
        >
          <RotateCcw size={14} />
        </button>
        <span className="w-px h-4 bg-border-subtle mx-1" />
        <button
          title="Step Over (requires a DAP debugger)"
          disabled
          className="p-1.5 text-text-muted opacity-25"
        >
          <ArrowDown size={14} />
        </button>
        <button
          title="Step Into (requires a DAP debugger)"
          disabled
          className="p-1.5 text-text-muted opacity-25"
        >
          <ArrowRight size={14} />
        </button>
        <button
          title="Step Out (requires a DAP debugger)"
          disabled
          className="p-1.5 text-text-muted opacity-25"
        >
          <ArrowUp size={14} />
        </button>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-muted">
          {running && <Loader2 size={11} className="animate-spin text-success" />}
          <span className={running ? "text-success" : undefined}>
            {running ? "RUNNING" : proc.state === "exited" ? `EXITED ${proc.code}` : title}
          </span>
        </div>
      </div>

      {/* Output */}
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
      >
        {lines.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            {detecting
              ? "Detecting project type..."
              : runKind
                ? "Press Run to start the project"
                : "No runnable project. Select a folder with Cargo.toml or package.json."}
          </div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.startsWith("$ ")
                ? "text-accent-primary"
                : proc.error && line.includes(proc.error)
                  ? "text-error"
                  : line.includes("error[") || line.startsWith("error:")
                    ? "text-error"
                    : "text-text-secondary"
            }
          >
            {line || "\u00a0"}
          </div>
        ))}
      </div>
    </div>
  );
}
