import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import {
  getBrowserContext,
  getBrowserContextText,
  browserNavigate,
  browserScreenshot,
  browserClick,
  browserType,
  browserStop,
  type BrowserContext,
} from "../../lib/tauri-commands";
import { notify } from "../../stores/toastStore";
import { ArrowLeft, Globe, Trash2, RefreshCw, ExternalLink, Copy, Play, Camera, StopCircle, MousePointerClick } from "lucide-react";

export function BrowserPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const [ctx, setCtx] = useState<BrowserContext | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [selector, setSelector] = useState("");
  const [clicking, setClicking] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [typing, setTyping] = useState(false);

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
    } catch (err) {
      console.error("Failed to load browser context text:", err);
    }
  };

  useEffect(() => {
    load();
    loadText();
  }, []);

  const handleNavigate = async () => {
    if (!url.trim()) return;
    setNavigating(true);
    setError(null);
    try {
      await browserNavigate(url.trim());
      notify("success", "Navigated", url.trim());
      setUrl("");
      await load();
      await loadText();
    } catch (e) {
      setError(`Navigation failed: ${e}`);
      notify("error", "Navigation failed", `${e}`);
    }
    setNavigating(false);
  };

  const handleScreenshot = async () => {
    setCapturing(true);
    setError(null);
    try {
      const path = await browserScreenshot();
      setScreenshot(path);
      notify("success", "Screenshot captured");
    } catch (e) {
      setError(`Screenshot failed: ${e}`);
      notify("error", "Screenshot failed", `${e}`);
    }
    setCapturing(false);
  };

  const handleClick = async () => {
    if (!selector.trim()) return;
    setClicking(true);
    setError(null);
    try {
      await browserClick(selector.trim());
      notify("success", "Clicked", selector.trim());
    } catch (e) {
      setError(`Click failed: ${e}`);
      notify("error", "Click failed", `${e}`);
    }
    setClicking(false);
  };

  const handleType = async () => {
    if (!selector.trim() || !typingText.trim()) return;
    setTyping(true);
    setError(null);
    try {
      await browserType(selector.trim(), typingText);
      notify("success", "Typed into", selector.trim());
      setTypingText("");
    } catch (e) {
      setError(`Typing failed: ${e}`);
      notify("error", "Typing failed", `${e}`);
    }
    setTyping(false);
  };

  const handleStop = async () => {
    try {
      await browserStop();
      setScreenshot(null);
      notify("success", "Browser stopped");
    } catch (e) {
      setError(`${e}`);
    }
  };

  const handleClear = async () => {
    try {
      setCtx(null);
      setText("");
      await load();
      await loadText();
    } catch (e) {
      setError(`Failed to clear context: ${e}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy to clipboard:", err);
    });
  };

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Browser panel">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex gap-1">
          <button
            onClick={load}
            aria-label="Refresh browser context"
            className="p-1.5 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-elevated"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleStop}
            aria-label="Stop the managed browser"
            className="p-1.5 text-fg-muted hover:text-error transition-fast rounded hover:bg-surface-elevated"
            title="Stop managed browser"
          >
            <StopCircle size={14} />
          </button>
          <button
            onClick={handleClear}
            aria-label="Clear browser context"
            className="p-1.5 text-fg-muted hover:text-error transition-fast rounded hover:bg-surface-elevated"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Real navigation */}
      <div className="px-3 py-2 border-b border-border-subtle surface-blur">
        <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1.5">
          Navigate (managed Chromium)
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNavigate();
            }}
            className="flex-1 p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleNavigate}
            disabled={!url.trim() || navigating}
            className="px-2 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 transition-fast flex items-center gap-1"
          >
            <Play size={11} />
            {navigating ? "Opening..." : "Open"}
          </button>
          <button
            onClick={handleScreenshot}
            disabled={capturing}
            className="px-2 py-1.5 text-xs bg-surface-elevated border border-border-subtle text-fg-primary rounded hover:bg-surface-hover disabled:opacity-50 transition-fast flex items-center gap-1"
            title="Capture screenshot of current page"
          >
            <Camera size={11} />
            {capturing ? "..." : "Shot"}
          </button>
        </div>

        {/* Selector action bar */}
        <div className="flex gap-1 mt-1.5">
          <input
            type="text"
            placeholder="CSS selector (e.g. #login-email)"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleClick();
            }}
            className="flex-1 p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary placeholder-text-muted focus:outline-none focus:border-accent font-mono"
          />
          <button
            onClick={handleClick}
            disabled={!selector.trim() || clicking}
            className="px-2 py-1.5 text-xs bg-surface-elevated border border-border-subtle text-fg-primary rounded hover:bg-surface-hover disabled:opacity-50 transition-fast flex items-center gap-1"
            title="Click the element matched by the selector"
          >
            <MousePointerClick size={11} />
            {clicking ? "..." : "Click"}
          </button>
          <input
            type="text"
            placeholder="Text to type"
            value={typingText}
            onChange={(e) => setTypingText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleType();
            }}
            className="flex-1 p-1.5 text-xs bg-surface-elevated border border-border-subtle rounded text-fg-primary placeholder-text-muted focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleType}
            disabled={!selector.trim() || !typingText.trim() || typing}
            className="px-2 py-1.5 text-xs bg-surface-elevated border border-border-subtle text-fg-primary rounded hover:bg-surface-hover disabled:opacity-50 transition-fast"
            title="Type into the element matched by the selector"
          >
            {typing ? "..." : "Type"}
          </button>
        </div>
        <div className="text-[11px] text-fg-muted mt-1">
          A headless Chrome/Edge is launched automatically on first navigation.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 my-2 p-2 rounded bg-surface-elevated border border-border-subtle">
          <div className="text-xs text-error">{error}</div>
        </div>
      )}

      {/* Screenshot */}
      {screenshot && (
        <div className="px-3 py-2 border-b border-border-subtle">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1.5">
            Page Screenshot
          </div>
          {screenshot.startsWith("data:") ? (
            <img src={screenshot} alt="Browser screenshot" className="w-full rounded border border-border-subtle" />
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-fg-secondary">
              <span className="truncate">{screenshot}</span>
              <a
                href={`file://${screenshot.replace(/\\/g, "/")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline shrink-0"
              >
                Open
              </a>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-fg-muted text-xs animate-pulse">
            <Globe size={14} />
            Loading browser context...
          </div>
        </div>
      )}

      {/* Active tab */}
      {ctx?.active_tab && (
        <div className="px-3 py-2 border-b border-border-subtle surface-blur">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1.5">
            Current Tab
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-fg-primary truncate">
                {ctx.active_tab.title}
              </div>
              <div className="text-[11px] text-fg-muted truncate">
                {ctx.active_tab.url}
              </div>
            </div>
            <a
              href={ctx.active_tab.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in external browser"
              className="p-1 text-fg-muted hover:text-fg-primary transition-fast"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Recent tabs */}
      {ctx && ctx.recent_tabs.length > 0 && (
        <div className="px-3 py-2 border-b border-border-subtle surface-blur">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1.5">
            Recent Tabs ({ctx.recent_tabs.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {ctx.recent_tabs.map((tab, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-fg-muted w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-fg-primary truncate">
                    {tab.title}
                  </div>
                  <div className="text-[11px] text-fg-muted truncate">
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
          <span className="text-[11px] uppercase tracking-wider text-fg-muted">
            Context Summary
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy URL"
            className="p-1 text-fg-muted hover:text-fg-primary transition-fast"
            title="Copy"
          >
            <Copy size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          <pre className="text-[11px] text-fg-secondary font-mono whitespace-pre-wrap bg-surface-elevated p-2 rounded">
            {text || "No browser context available. Navigate to a page to begin."}
          </pre>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-3 py-2 border-t border-border-subtle bg-surface-elevated">
        <div className="text-[11px] text-fg-muted">
          Enter a URL and press Open to drive a managed Chromium browser via CDP. Use a CSS selector to click elements and capture screenshots.
        </div>
      </div>
    </div>
  );
}
