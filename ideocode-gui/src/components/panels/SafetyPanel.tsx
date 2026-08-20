import { useState } from "react";
import { Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

interface SafetyRule { id: string; label: string; enabled: boolean; }
const STORAGE_KEY = "idc-safety";
function loadRules(): SafetyRule[] {
  const defaults = [
    { id: "file-delete", label: "Confirm file deletion", enabled: true },
    { id: "git-force", label: "Confirm git force push", enabled: true },
    { id: "shell-danger", label: "Confirm dangerous shell commands", enabled: true },
    { id: "mcp-invoke", label: "Confirm MCP tool invocation", enabled: false },
    { id: "plugin-install", label: "Confirm plugin installation", enabled: true },
  ];
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return s.length > 0 ? s : defaults; } catch { return defaults; }
}
function saveRules(items: SafetyRule[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

export function SafetyPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [rules, setRules] = useState<SafetyRule[]>(loadRules);

  const toggle = (id: string) => {
    const next = rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setRules(next); saveRules(next);
  };

  const resetDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRules(loadRules());
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Safety panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Shield size={14} /> Safety
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-bg-elevated transition-fast">
            <span className="text-xs text-text-primary">{r.label}</span>
            <button onClick={() => toggle(r.id)} aria-label={`Toggle ${r.label}`} aria-expanded={r.enabled}>
              {r.enabled ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-text-muted" />}
            </button>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border-subtle">
        <button onClick={resetDefaults}
          className="w-full px-3 py-1.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded transition-fast border border-border-subtle">
          Reset to Defaults
        </button>
        <div className="mt-1.5 text-[11px] text-text-muted">
          Safety confirmations protect against destructive operations. Toggle each rule to control when you see confirmation dialogs.
        </div>
      </div>
    </div>
  );
}
