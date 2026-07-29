import { useState, useRef } from "react";
import { Play, RotateCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { runBuild, runCargoCheck } from "../../lib/tauri-commands";
import { useFileStore } from "../../stores/fileStore";
import type { BuildOutput } from "../../lib/tauri-commands";

export function BuildPanel() {
  const rootPath = useFileStore((s) => s.rootPath);
  const [output, setOutput] = useState<BuildOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<"build" | "check" | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleBuild = async () => {
    setLoading(true);
    setActiveTask("build");
    try {
      const res = await runBuild(rootPath);
      setOutput(res);
    } catch (e) {
      setOutput({ success: false, stdout: "", stderr: String(e), exit_code: -1 });
    }
    setLoading(false);
    setActiveTask(null);
    setTimeout(() => outputRef.current?.scrollTo(0, outputRef.current.scrollHeight), 100);
  };

  const handleCheck = async () => {
    setLoading(true);
    setActiveTask("check");
    try {
      const res = await runCargoCheck(rootPath);
      setOutput(res);
    } catch (e) {
      setOutput({ success: false, stdout: "", stderr: String(e), exit_code: -1 });
    }
    setLoading(false);
    setActiveTask(null);
    setTimeout(() => outputRef.current?.scrollTo(0, outputRef.current.scrollHeight), 100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <button
          onClick={handleBuild}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-fast
            bg-accent-primary text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {loading && activeTask === "build" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          Build
        </button>
        <button
          onClick={handleCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-fast
            bg-bg-elevated text-text-primary hover:bg-bg-hover disabled:opacity-40 border border-border-subtle"
        >
          {loading && activeTask === "check" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RotateCw size={14} />
          )}
          Check
        </button>

        {output && (
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            {output.success ? (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle size={12} /> Passed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-error">
                <XCircle size={12} /> Failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
      >
        {!output && !loading && (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            Run a build or check to see output
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-text-muted text-xs animate-pulse mb-2">
            <Loader2 size={12} className="animate-spin" />
            Running cargo {activeTask}...
          </div>
        )}
        {output && output.stdout && (
          <div className="text-text-primary">{output.stdout}</div>
        )}
        {output && output.stderr && (
          <div className="text-warning">{output.stderr}</div>
        )}
      </div>
    </div>
  );
}
