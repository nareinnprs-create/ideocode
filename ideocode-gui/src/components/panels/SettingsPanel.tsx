import { useState, useEffect, useRef } from "react";
import { Sun, Moon, AlertCircle } from "lucide-react";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import type { AppSettings } from "../../lib/tauri-commands";

type Tab = "appearance" | "editor" | "about";

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20];
const FONT_FAMILIES = [
  "JetBrains Mono",
  "Fira Code",
  "Cascadia Code",
  "Source Code Pro",
  "Monaco",
  "monospace",
];

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>("appearance");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch((e) => setError(`Failed to load settings: ${e}`));
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaved(false);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSettings(next)
        .then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })
        .catch((e) => setError(`Failed to save settings: ${e}`));
    }, 300);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-px px-2 pt-2 border-b border-border-subtle bg-bg-tertiary">
        {(["appearance", "editor", "about"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-[10px] font-medium rounded-t transition-fast uppercase tracking-wider
              ${tab === t
                ? "text-accent-primary bg-bg-secondary border-b-2 border-accent-primary"
                : "text-text-muted hover:text-text-secondary"
              }`}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        {saved && (
          <span className="text-[10px] text-success self-center mr-2">Saved</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mt-2 p-2 rounded bg-error/10 border border-error/30">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-error mt-0.5 shrink-0" />
            <div className="text-xs text-error">{error}</div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!settings ? (
          <div className="p-4 text-center text-text-muted text-xs">Loading...</div>
        ) : tab === "appearance" ? (
          <AppearanceTab settings={settings} onChange={handleChange} />
        ) : tab === "editor" ? (
          <EditorTab settings={settings} onChange={handleChange} />
        ) : (
          <AboutTab />
        )}
      </div>
    </div>
  );
}

function AppearanceTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (p: Partial<AppSettings>) => void;
}) {
  return (
    <div className="p-4 space-y-5">
      {/* Theme */}
      <Section label="Theme">
        <div className="flex gap-2">
          {[
            { id: "midnight", icon: Moon, label: "Midnight" },
            { id: "dark", icon: Moon, label: "Dark" },
            { id: "light", icon: Sun, label: "Light" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onChange({ theme: id })}
              className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border transition-fast text-xs
                ${settings.theme === id
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </Section>

      {/* Font Family */}
      <Section label="Font Family">
        <select
          value={settings.font_family}
          onChange={(e) => onChange({ font_family: e.target.value })}
          className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </Section>

      {/* Font Size */}
      <Section label="Font Size">
        <div className="flex gap-1.5 flex-wrap">
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ font_size: s })}
              className={`px-2.5 py-1 text-xs rounded transition-fast border
                ${settings.font_size === s
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function EditorTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (p: Partial<AppSettings>) => void;
}) {
  return (
    <div className="p-4 space-y-5">
      <Section label="Tab Size">
        <div className="flex gap-1.5">
          {[2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => onChange({ tab_size: s })}
              className={`px-2.5 py-1 text-xs rounded transition-fast border
                ${settings.tab_size === s
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <ToggleRow
        label="Word Wrap"
        description="Wrap lines that exceed editor width"
        checked={settings.word_wrap}
        onChange={(v) => onChange({ word_wrap: v })}
      />
      <ToggleRow
        label="Minimap"
        description="Show code minimap overview"
        checked={settings.minimap}
        onChange={(v) => onChange({ minimap: v })}
      />
      <ToggleRow
        label="Auto Save"
        description="Automatically save files on changes"
        checked={settings.auto_save}
        onChange={(v) => onChange({ auto_save: v })}
      />
    </div>
  );
}

function AboutTab() {
  return (
    <div className="p-6 text-center space-y-4">
      <div className="text-2xl font-display font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
        IDEOCODE
      </div>
      <div className="text-text-muted text-xs">
        <p>Version 0.1.0</p>
        <p className="mt-2">Multi-model AI coding assistant</p>
        <p className="mt-4 text-text-muted/60">
          Built with Tauri 2.x + React 19 + TypeScript
        </p>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-secondary mb-2 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 rounded-full transition-fast mt-0.5
          ${checked ? "bg-accent-primary" : "bg-bg-elevated border border-border-subtle"}`}
        style={{ height: "18px", width: "32px" }}
      >
        <div
          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform
            ${checked ? "translate-x-4" : "translate-x-0.5"}`}
          style={{ width: "14px", height: "14px", top: "1px" }}
        />
      </button>
      <div>
        <div className="text-xs text-text-primary">{label}</div>
        <div className="text-[10px] text-text-muted mt-0.5">{description}</div>
      </div>
    </div>
  );
}
