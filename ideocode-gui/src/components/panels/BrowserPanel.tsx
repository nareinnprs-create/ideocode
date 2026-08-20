import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import {
  getBrowserContext,
  setBrowserTab,
  clearBrowserContext,
  getBrowserContextText,
  type BrowserContext,
} from "../../lib/tauri-commands";
import { ArrowLeft, Globe, Trash2, RefreshCw, ExternalLink, Copy } from "lucide-react";

export function BrowserPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [ctx, setCtx] = useState<BrowserContext | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getBrowserContext();
      setCtx(result);
      setError(null);
    } catch (e) {
      setError(`${e}`);
    }
    setLoading(false);
  };

  const loadText = async () => {
    try {
      const t = await getBrowserContextText();
      setText(t);
    } catch (_) {}
  };

  useEffect(() => {
    load();
    loadText();
  }, []);

  const handleSetTab = async () => {
    if (!url.trim()) return;
    try {
      await setBrowserTab(url.trim(), title.trim() || url.trim());
      await load();
      await loadText();
      setUrl("");
      setTitle("");
    } catch (e) {
      setError(`Failed to set tab: ${e}`);
    }
  };

  const handleClear = async () => {
    try {
      await clearBrowserContext();
      setCtx(null);
      setText("");
      await load();
      await loadText();
    } catch (e) {
      setError(`Failed to clear context: ${e}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex gap-1">
          <button
            onClick={load}
            className="p-1.5 text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 text-text-muted hover:text-error transition-fast rounded hover:bg-bg-elevated"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Manual tab input */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
          Add Tab Manually
        </div>
        <input
          type="text"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary mb-1"
        />
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Page title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 p-1.5 text-xs bg-bg-tertiary border border-border-subtle rounded text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-primary"
          />
          <button
            onClick={handleSetTab}
            disabled={!url.trim()}
            className="px-2 py-1.5 text-xs bg-accent-primary text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast"
          >
            Add
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 p-2 rounded bg-bg-elevated border border-border-subtle">
          <div className="text-xs text-error">{error}</div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-text-muted text-xs animate-pulse">
            <Globe size={14} />
            Loading browser context...
          </div>
        </div>
      )}

      {/* Active tab */}
      {ctx?.active_tab && (
        <div className="px-3 py-2 border-b border-border-subtle">
          <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
            Current Tab
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-accent-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-primary truncate">
                {ctx.active_tab.title}
              </div>
              <div className="text-[11px] text-text-muted truncate">
                {ctx.active_tab.url}
              </div>
            </div>
            <a
              href={ctx.active_tab.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-text-muted hover:text-text-primary transition-fast"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Recent tabs */}
      {ctx && ctx.recent_tabs.length > 0 && (
        <div className="px-3 py-2 border-b border-border-subtle">
          <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1.5">
            Recent Tabs ({ctx.recent_tabs.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {ctx.recent_tabs.map((tab, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-text-primary truncate">
                    {tab.title}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {tab.url}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context text */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-[11px] uppercase tracking-wider text-text-muted">
            Context Summary
          </span>
          <button
            onClick={handleCopy}
            className="p-1 text-text-muted hover:text-text-primary transition-fast"
            title="Copy"
          >
            <Copy size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          <pre className="text-[11px] text-text-secondary font-mono whitespace-pre-wrap bg-bg-tertiary p-2 rounded">
            {text || "No browser context available. Use the browser extension to share tabs."}
          </pre>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-3 py-2 border-t border-border-subtle bg-bg-elevated">
        <div className="text-[11px] text-text-muted">
          Install the browser extension or use the manual tab input above to share your browsing context with IDEOCODE.
        </div>
      </div>
    </div>
  );
}
