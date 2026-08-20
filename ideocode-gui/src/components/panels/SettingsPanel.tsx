import { useState, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { getSettings, updateSettings } from "../../lib/tauri-commands";
import type { AppSettings } from "../../lib/tauri-commands";
import { useAppStore } from "../../stores/appStore";
import { useProviderStore } from "../../stores/providerStore";
import { notify } from "../../stores/toastStore";
import { THEMES, type Theme } from "../../lib/theme-registry";

function persistThemeScheme(scheme: string) {
  localStorage.setItem("ideocode.scheme", scheme);
  document.documentElement.setAttribute("data-scheme", scheme);
}

type Tab = "appearance" | "chat" | "editor" | "providers" | "mcp" | "rules" | "terminal" | "shortcuts" | "privacy" | "about";

const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20];
const UI_FONT_SIZES = [11, 12, 13, 14, 15, 16, 18];
const ACCENTS = [
  "#7C3AED",
  "#6366F1",
  "#0EA5E9",
  "#14B8A6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
];
const REASONING_LEVELS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
const FONT_FAMILIES = [
  "JetBrains Mono",
  "Fira Code",
  "Cascadia Code",
  "Source Code Pro",
  "Monaco",
  "monospace",
];
const MODES = [
  { id: "normal", label: "Normal" },
  { id: "plan", label: "Plan" },
  { id: "agent", label: "Agent" },
];

export function SettingsPanel() {
  const [tab, setTab] = useState<Tab>("appearance");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch((e) => setError(`Failed to load settings: ${e}`));
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaved(false);
    setError(null);
    if (patch.theme) {
      useAppStore.getState().setTheme(patch.theme);
    }
    if (patch.accent_color) {
      useAppStore.getState().setAccentColor(patch.accent_color);
    }
    if (patch.ui_font_size) {
      useAppStore.getState().setUiFontSize(patch.ui_font_size);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSettings(next)
        .then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })
        .catch((e) => {
          setError(`Failed to save settings: ${e}`);
          notify("error", "Failed to save settings", `${e}`);
        });
    }, 300);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-px px-2 pt-2 border-b border-border-subtle bg-bg-tertiary">
        {(["appearance", "chat", "editor", "providers", "terminal", "shortcuts", "mcp", "rules", "privacy", "about"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-[11px] font-medium rounded-t transition-fast uppercase tracking-wider
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
          <span className="text-[11px] text-success self-center mr-2">Saved</span>
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
        ) : tab === "chat" ? (
          <ChatTab settings={settings} onChange={handleChange} />
        ) : tab === "editor" ? (
          <EditorTab settings={settings} onChange={handleChange} />
        ) : tab === "providers" ? (
          <ProvidersTab settings={settings} onChange={handleChange} />
        ) : tab === "terminal" ? (
          <TerminalTab settings={settings} onChange={handleChange} />
        ) : tab === "shortcuts" ? (
          <ShortcutsTab />
        ) : tab === "privacy" ? (
          <PrivacyTab settings={settings} onChange={handleChange} />
        ) : tab === "rules" ? (
          <RulesTab settings={settings} onChange={handleChange} />
        ) : tab === "mcp" ? (
          <MCPTab />
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
  const currentTheme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [scheme, setScheme] = useState<"light" | "system" | "dark">(() => {
    try {
      const stored = localStorage.getItem("ideocode.scheme");
      return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    persistThemeScheme(scheme);
  }, [scheme]);

  const handleThemeSelect = (themeId: Theme) => {
    setTheme(themeId);
    onChange({ theme: themeId });
  };

  const tierGroups = ["Default", "Classic", "Cyberpunk", "Minimal"] as const;

  return (
    <div className="p-4 space-y-5">
      {/* Color Scheme */}
      <Section label="Color Scheme">
        <div className="flex gap-1.5">
          {([
            { id: "light" as const, label: "Light", hint: "Always light" },
            { id: "system" as const, label: "System", hint: "Follow OS (light by default)" },
            { id: "dark" as const, label: "Dark", hint: "Force dark" },
          ]).map((m) => (
            <button
              key={m.id}
              onClick={() => setScheme(m.id)}
              title={m.hint}
              className={`flex-1 px-2 py-1.5 text-xs rounded transition-fast border
                ${
                  scheme === m.id
                    ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                    : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Theme Picker */}
      <Section label="Theme">
        <div className="space-y-4">
          {tierGroups.map((tier) => {
            const themesInTier = THEMES.filter((t) => t.tier === tier);
            if (themesInTier.length === 0) return null;
            return (
              <div key={tier}>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-medium">{tier}</div>
                <div className="grid grid-cols-2 gap-2">
                  {themesInTier.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeSelect(t.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left
                        ${currentTheme === t.id
                          ? "border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary/30"
                          : "border-border-subtle hover:border-text-muted hover:bg-bg-hover"
                        }`}
                    >
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <div className="w-5 h-5 rounded-md border border-white/10" style={{ background: t.bg }} />
                        <div className="w-5 h-5 rounded-md border border-white/10" style={{ background: t.bgSecondary }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">{t.label}</div>
                        <div className="text-[10px] text-text-muted truncate">{t.description}</div>
                      </div>
                      <div className="ml-auto shrink-0">
                        <div className="w-3 h-3 rounded-full" style={{ background: t.accent }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
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

      {/* Accent Color */}
      <Section label="Accent Color">
        <div className="flex gap-2 flex-wrap">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => onChange({ accent_color: c })}
              aria-label={`Accent ${c}`}
              className={`w-7 h-7 rounded-full transition-fast border-2 ${
                settings.accent_color === c
                  ? "border-text-primary scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="color"
            value={settings.accent_color}
            onChange={(e) => onChange({ accent_color: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer bg-transparent border border-border-subtle"
            aria-label="Custom accent color"
          />
          <span className="text-[11px] text-text-muted font-mono">{settings.accent_color}</span>
        </div>
      </Section>

      {/* UI Font Size */}
      <Section label="UI Scale">
        <div className="flex gap-1.5 flex-wrap">
          {UI_FONT_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ui_font_size: s })}
              className={`px-2.5 py-1 text-xs rounded transition-fast border
                ${settings.ui_font_size === s
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-muted mt-1">
          Scales the whole interface. The editor font size above is independent.
        </p>
      </Section>
    </div>
  );
}

function ChatTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (p: Partial<AppSettings>) => void;
}) {
  const providers = useProviderStore((s) => s.providers);
  const modelOptions = providers.flatMap((p) => p.models.map((m) => m.id));

  return (
    <div className="p-4 space-y-5">
      <Section label="Default Mode">
        <div className="flex gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onChange({ mode: m.id })}
              className={`px-2.5 py-1 text-xs rounded transition-fast border
                ${settings.mode === m.id
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Default Model">
        <select
          value={settings.active_model}
          onChange={(e) => onChange({ active_model: e.target.value })}
          className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none font-mono"
        >
          <option value="auto">auto</option>
          {modelOptions.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
        {modelOptions.length === 0 && (
          <p className="text-[11px] text-text-muted mt-1">
            No providers loaded yet — pick a model in the chat composer to populate this list.
          </p>
        )}
      </Section>

      <Section label="Reasoning Effort">
        <div className="flex gap-1.5">
          {REASONING_LEVELS.map((r) => (
            <button
              key={r.id}
              onClick={() => onChange({ reasoning_effort: r.id })}
              className={`px-2.5 py-1 text-xs rounded transition-fast border
                ${settings.reasoning_effort === r.id
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-muted mt-1">
          Controls how much effort reasoning models spend on each response.
        </p>
      </Section>

      <ToggleRow
        label="Dev Mode"
        description="Show extra debugging details (raw tool inputs, timing, low-level errors)"
        checked={settings.dev_mode}
        onChange={(v) => onChange({ dev_mode: v })}
      />
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
  const version = useAppStore((s) => s.version);
  return (
    <div className="p-6 text-center space-y-4">
      <div className="text-xl font-semibold text-text-primary">IDEOCODE</div>
      <div className="text-text-muted text-xs">
        <p>Version {version}</p>
        <p className="mt-2">Multi-model AI coding assistant</p>
        <p className="mt-4 text-text-muted">
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
        <div className="text-[11px] text-text-muted mt-0.5">{description}</div>
      </div>
    </div>
  );
}

function ProvidersTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (p: Partial<AppSettings>) => void;
}) {
  const handleKeyChange = (provider: string, key: string) => {
    const nextKeys = { ...(settings.api_keys || {}), [provider]: key };
    onChange({ api_keys: nextKeys });
  };

  return (
    <div className="p-4 space-y-5">
      <Section label="API Keys">
        <p className="text-[11px] text-text-muted mb-3">
          Enter your API keys for the providers you wish to use. Keys are stored locally.
        </p>
        <div className="space-y-3">
          {(["openai", "anthropic", "gemini"]).map((provider) => (
            <div key={provider} className="flex flex-col gap-1">
              <label className="text-xs text-text-primary capitalize">{provider}</label>
              <input
                type="password"
                value={settings.api_keys?.[provider] || ""}
                onChange={(e) => handleKeyChange(provider, e.target.value)}
                placeholder={`sk-...`}
                className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none font-mono"
              />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function RulesTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (p: Partial<AppSettings>) => void;
}) {
  return (
    <div className="p-4 space-y-5 flex flex-col h-full">
      <Section label="Custom Instructions">
        <p className="text-[11px] text-text-muted mb-3">
          These instructions will be appended to the system prompt for every chat session, helping you customize how IDEOCODE behaves.
        </p>
        <textarea
          value={settings.custom_instructions || ""}
          onChange={(e) => onChange({ custom_instructions: e.target.value })}
          placeholder="e.g. Always use TypeScript and standard format. Keep answers concise."
          className="w-full h-48 bg-bg-primary border border-border-subtle rounded px-2 py-2 text-xs text-text-primary outline-none resize-none font-sans"
        />
      </Section>
    </div>
  );
}

function TerminalTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (p: Partial<AppSettings>) => void;
}) {
  return (
    <div className="p-4 space-y-5">
      <Section label="Shell">
        <select
          value={settings.terminal_shell || "default"}
          onChange={(e) => onChange({ terminal_shell: e.target.value })}
          className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none"
        >
          <option value="default">System Default</option>
          <option value="bash">Bash</option>
          <option value="zsh">Zsh</option>
          <option value="powershell">PowerShell</option>
          <option value="cmd">Command Prompt</option>
        </select>
        <p className="text-[11px] text-text-muted mt-1">
          Shell used for the integrated terminal.
        </p>
      </Section>

      <Section label="Font Size">
        <div className="flex gap-1.5 flex-wrap">
          {[11, 12, 13, 14, 15, 16].map((s) => (
            <button
              key={s}
              onClick={() => onChange({ terminal_font_size: s })}
              className={`px-2.5 py-1 text-xs rounded transition-fast border
                ${(settings.terminal_font_size ?? 13) === s
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section label="Cursor Style">
        <div className="flex gap-1.5">
          {(["block", "bar", "underline"] as const).map((style) => (
            <button
              key={style}
              onClick={() => onChange({ terminal_cursor_style: style })}
              className={`px-2.5 py-1 text-xs rounded transition-fast border capitalize
                ${(settings.terminal_cursor_style ?? "bar") === style
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle text-text-muted hover:border-text-muted"
                }`}
            >
              {style}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function ShortcutsTab() {
  return (
    <div className="p-4 space-y-4">
      <Section label="Keyboard Shortcuts">
        <p className="text-[11px] text-text-muted mb-3">
          Current keyboard shortcuts. Edit them from the Keyboard Shortcuts panel.
        </p>
        <div className="space-y-2">
          {[
            { keys: "Ctrl+K", action: "Open Command Palette" },
            { keys: "Ctrl+B", action: "Toggle Sidebar" },
            { keys: "Ctrl+\\", action: "Toggle Right Panel" },
            { keys: "Ctrl+J", action: "Toggle Bottom Panel" },
            { keys: "Ctrl+`", action: "Open Terminal" },
            { keys: "Ctrl+N", action: "New Chat" },
            { keys: "Ctrl+S", action: "Save File" },
            { keys: "Ctrl+P", action: "Quick Open File" },
            { keys: "Ctrl+I", action: "Toggle Composer" },
            { keys: "Escape", action: "Close Overlays" },
          ].map(({ keys, action }) => (
            <div key={keys} className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0">
              <span className="text-xs text-text-secondary">{action}</span>
              <kbd className="px-2 py-0.5 rounded bg-bg-tertiary text-[11px] font-mono text-text-muted border border-border-subtle">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function PrivacyTab({
  settings,
  onChange,
}: {
  settings: AppSettings;
  onChange: (p: Partial<AppSettings>) => void;
}) {
  return (
    <div className="p-4 space-y-5">
      <Section label="Data Privacy">
        <div className="space-y-3">
          <ToggleRow
            label="Local Mode"
            description="Keep all processing local — never send data to external APIs"
            checked={settings.privacy_local ?? false}
            onChange={(v) => onChange({ privacy_local: v })}
          />
          <ToggleRow
            label="Anonymous Telemetry"
            description="Help improve IDEOCODE by sending anonymous usage data"
            checked={settings.privacy_telemetry ?? true}
            onChange={(v) => onChange({ privacy_telemetry: v })}
          />
          <ToggleRow
            label="Mask File Contents"
            description="Never include file contents in error reports or telemetry"
            checked={settings.privacy_mask_files ?? true}
            onChange={(v) => onChange({ privacy_mask_files: v })}
          />
        </div>
        <p className="text-[11px] text-text-muted mt-3">
          All chat messages are processed locally through the IDEOCODE engine. 
          API keys are stored locally and never shared.
        </p>
      </Section>
    </div>
  );
}

function MCPTab() {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-xs font-medium text-text-primary mb-2">MCP Server Configuration</h4>
        <p className="text-[11px] text-text-muted mb-3">
          Model Context Protocol servers extend IDEOCODE with external tools and data sources.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded bg-bg-elevated border border-border-subtle">
            <div>
              <div className="text-xs text-text-primary">MCP Integration</div>
              <div className="text-[10px] text-text-muted">Requires MCP backend server</div>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">Not Available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
