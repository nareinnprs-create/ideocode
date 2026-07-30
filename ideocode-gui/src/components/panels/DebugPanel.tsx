import { BugPlay, ArrowDown, ArrowUp, ArrowRight, RotateCcw, Square } from "lucide-react";
import { useState } from "react";

export function DebugPanel() {
  const [debugActive] = useState(false);

  const buttons = [
    { icon: BugPlay, label: "Start", active: false },
    { icon: ArrowDown, label: "Step Over", active: false },
    { icon: ArrowRight, label: "Step Into", active: false },
    { icon: ArrowUp, label: "Step Out", active: false },
    { icon: RotateCcw, label: "Restart", active: false },
    { icon: Square, label: "Stop", active: false },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border-subtle">
        {buttons.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            title={`${label}${!debugActive ? " (no active session)" : ""}`}
            disabled={!debugActive}
            className="p-1.5 text-text-muted disabled:opacity-25 enabled:hover:bg-bg-elevated transition-fast rounded"
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Variables */}
      <div className="flex-1 overflow-y-auto">
        <Section title="Variables">
          <div className="px-3 py-4 text-center text-text-muted text-xs">
            Start a debugging session to see variables
          </div>
        </Section>

        <Section title="Watch">
          <div className="px-3 py-4 text-center text-text-muted text-xs">
            Add expressions to watch
          </div>
        </Section>

        <Section title="Call Stack">
          <div className="px-3 py-4 text-center text-text-muted text-xs">
            No active debug session
          </div>
        </Section>

        <Section title="Breakpoints">
          <div className="px-3 py-4 text-center text-text-muted text-xs">
            Set breakpoints in the editor
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wider bg-bg-tertiary/50 border-b border-border-subtle">
        {title}
      </div>
      {children}
    </div>
  );
}
