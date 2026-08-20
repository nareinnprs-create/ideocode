import { useState } from "react";
import { AlertTriangle, Cast, MonitorPlay } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

export function RemoteControlPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [sessionId, setSessionId] = useState("");
  const [active, setActive] = useState(false);

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Remote control">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Cast size={14} /> Remote Control
        </button>
      </div>
      <div className="mx-3 mt-2 p-2 rounded bg-warning/5 border border-warning/20">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-warning shrink-0" />
          <span className="text-[11px] text-warning">This feature requires a backend server. Currently showing UI only.</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <div className="p-3 rounded-lg bg-bg-tertiary border border-border-subtle text-center">
          <MonitorPlay size={32} className={`mx-auto mb-2 ${active ? "text-success" : "text-text-muted/40"}`} />
          <div className="text-xs font-medium text-text-primary mb-1">
            {active ? "Session Active" : "No Active Session"}
          </div>
          <div className="text-[11px] text-text-muted">
            {active ? "Others can view your screen" : "Start a session to share your screen"}
          </div>
        </div>
        {!active ? (
          <div className="space-y-2">
            <input type="text" placeholder="Session ID (leave empty to create new)" value={sessionId} onChange={(e) => setSessionId(e.target.value)}
              aria-label="Session ID"
              className="w-full p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
            <button onClick={() => setActive(true)}
              className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover transition-fast">
              Start Session
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="p-2 rounded bg-bg-elevated border border-border-subtle">
              <div className="text-[11px] text-text-muted">Session ID</div>
              <div className="text-xs font-mono text-accent-primary">{sessionId || `session-${Date.now()}`}</div>
            </div>
            <button onClick={() => { setActive(false); setSessionId(""); }}
              className="w-full px-3 py-1.5 text-xs bg-error/10 text-error rounded hover:bg-error/20 transition-fast">
              End Session
            </button>
          </div>
        )}
        <div className="text-[11px] text-text-muted leading-relaxed p-2 rounded bg-bg-elevated border border-border-subtle">
          Share your IDEOCODE session with others. They can view your screen in real-time.
        </div>
      </div>
    </div>
  );
}
