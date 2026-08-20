import { useState } from "react";
import { Zap, Plus, Trash2, Clock, ToggleLeft, ToggleRight, Play } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useAutomationStore, type AutomationFrequency } from "../../stores/automationStore";

export function AutomationsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const automations = useAutomationStore((s) => s.automations);
  const addAutomation = useAutomationStore((s) => s.add);
  const toggleAutomation = useAutomationStore((s) => s.toggle);
  const removeAutomation = useAutomationStore((s) => s.remove);
  const runNow = useAutomationStore((s) => s.runNow);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [frequency, setFrequency] = useState<AutomationFrequency>("daily");
  const [command, setCommand] = useState("");
  const [model, setModel] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !command.trim()) return;
    addAutomation({
      name,
      description: desc,
      frequency,
      command,
      model: model || undefined,
    });
    setName("");
    setDesc("");
    setCommand("");
    setModel("");
    setShowAdd(false);
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-success/10 text-success",
      paused: "bg-warning/10 text-warning",
      completed: "bg-bg-tertiary text-text-muted",
      failed: "bg-error/10 text-error",
    };
    return colors[status] ?? "bg-bg-tertiary text-text-muted";
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Automations panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <Zap size={14} /> Automations
        </button>
        <button onClick={() => setShowAdd(!showAdd)} aria-label="Add automation" aria-expanded={showAdd} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:text-accent-hover transition-fast rounded hover:bg-bg-elevated">
          <Plus size={14} /> Add
        </button>
      </div>
      {showAdd && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle space-y-1.5">
          <input type="text" placeholder="Automation name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <input type="text" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as AutomationFrequency)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary">
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom (Cron)</option>
          </select>
          <textarea placeholder="Command or action..." value={command} onChange={(e) => setCommand(e.target.value)} rows={2}
            className="w-full p-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary resize-none" />
          <input type="text" placeholder="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)}
            className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary focus:outline-none focus:border-accent-primary" />
          <button onClick={handleAdd} disabled={!name.trim() || !command.trim()}
            className="w-full px-3 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast">Create Automation</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <Zap size={24} className="mb-2 opacity-50" />
            <div className="text-xs">No automations yet</div>
          </div>
        ) : automations.map((a) => (
          <div key={a.id} className="px-3 py-2 border-b border-border-subtle hover:bg-bg-elevated transition-fast group">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleAutomation(a.id)} className="shrink-0">
                {a.enabled ? <ToggleRight size={16} className="text-success" /> : <ToggleLeft size={16} className="text-text-muted" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">{a.name}</div>
                <div className="text-[11px] text-text-muted truncate">{a.description || a.command}</div>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColor(a.status)}`}>{a.status}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{a.frequency}</span>
              {a.enabled && (
                <button onClick={() => runNow(a.id)} className="p-1 text-text-muted hover:text-accent-primary opacity-0 group-hover:opacity-100 transition-fast" title="Run now">
                  <Play size={11} />
                </button>
              )}
              <button onClick={() => removeAutomation(a.id)} aria-label="Delete automation" className="p-1 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-fast">
                <Trash2 size={11} />
              </button>
            </div>
            {a.lastRun && (
              <div className="flex items-center gap-1 mt-1 ml-6">
                <Clock size={10} className="text-text-muted" />
                <span className="text-[10px] text-text-muted">Last: {new Date(a.lastRun).toLocaleString()}</span>
                {a.runHistory.length > 0 && (
                  <span className="text-[10px] text-text-muted">· {a.runHistory.length} runs</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
