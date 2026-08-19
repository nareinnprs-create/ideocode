import { useState, useRef, useEffect, useCallback } from "react";
import { Trash2, Terminal } from "lucide-react";
import { eventBus } from "../../lib/eventBus";

interface OutputLine {
  text: string;
  ts: string;
}

export function OutputPanel() {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const append = useCallback((data: unknown) => {
    const text = typeof data === "string" ? data : String(data);
    const ts = new Date().toLocaleTimeString();
    setLines((prev) => [...prev, { text, ts }]);
  }, []);

  useEffect(() => {
    const unsubs = [
      eventBus.on("output", append),
      eventBus.on("build-output", append),
    ];
    return () => unsubs.forEach((u) => u());
  }, [append]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-border-subtle bg-bg-secondary">
        <Terminal size={13} className="text-text-muted" />
        <span className="text-xs font-medium text-text-primary">Output</span>
        <span className="text-[11px] text-text-muted">Build & process output</span>
        <div className="flex-1" />
        <button
          onClick={() => setLines([])}
          className="p-1 text-text-muted hover:text-error transition-fast rounded hover:bg-bg-elevated"
          title="Clear output"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed bg-bg-primary"
      >
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Terminal size={20} className="mb-2 opacity-40" />
            <span>No output yet</span>
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-2 text-text-secondary whitespace-pre-wrap break-all">
              <span className="text-text-muted shrink-0">{line.ts}</span>
              <span>{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
