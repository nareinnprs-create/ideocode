import { useState } from "react";
import { AlertTriangle, Radio, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";

interface BotConfig { platform: string; token: string; channel: string; enabled: boolean; }

const STORAGE_KEY = "idc-bot";
function loadConfig(): BotConfig { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return { platform: "discord", token: "", channel: "", enabled: false }; } }
function saveConfig(c: BotConfig) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

export function BotChannelPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [config, setConfig] = useState<BotConfig>(loadConfig);

  const update = (patch: Partial<BotConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    saveConfig(next);
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Bot channel panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated">
          <Radio size={14} /> Bot Channel
        </button>
      </div>
      <div className="mx-3 mt-2 p-2 rounded bg-warning/5 border border-warning/20">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-warning shrink-0" />
          <span className="text-[11px] text-warning">This feature requires a backend server. Currently showing UI only.</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <div>
          <label className="text-[11px] text-fg-muted uppercase tracking-wider block mb-1">Platform</label>
          <select value={config.platform} onChange={(e) => update({ platform: e.target.value })}
            className="w-full p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent">
            <option value="discord">Discord</option>
            <option value="slack">Slack</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-fg-muted uppercase tracking-wider block mb-1">Bot Token</label>
          <input type="password" placeholder="Enter bot token" value={config.token} onChange={(e) => update({ token: e.target.value })}
            className="w-full p-1.5 text-xs font-mono bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-[11px] text-fg-muted uppercase tracking-wider block mb-1">Channel ID</label>
          <input type="text" placeholder="Channel or workspace ID" value={config.channel} onChange={(e) => update({ channel: e.target.value })}
            className="w-full p-1.5 text-xs font-mono bg-surface-elevated border border-border-subtle rounded text-fg-primary focus:outline-none focus:border-accent" />
        </div>
        <div className="flex items-center justify-between p-2 rounded bg-surface-elevated border border-border-subtle">
          <span className="text-xs text-fg-primary">Enable bot</span>
          <button onClick={() => update({ enabled: !config.enabled })} aria-label={config.enabled ? "Disable bot" : "Enable bot"} aria-expanded={config.enabled}>
            {config.enabled ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-fg-muted" />}
          </button>
        </div>
        <div className="text-[11px] text-fg-muted leading-relaxed p-2 rounded bg-surface-elevated border border-border-subtle">
          Connect IDEOCODE to your chat platform. Messages sent in the configured channel will be forwarded to the AI agent.
        </div>
      </div>
    </div>
  );
}
