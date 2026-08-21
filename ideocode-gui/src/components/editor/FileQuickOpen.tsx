import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, X, FileCode2 } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useFileStore } from "../../stores/fileStore";
import { fuzzySearch } from "../../lib/fuzzy";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FileResult {
  path: string;
  name: string;
  score: number;
}

function flattenTree(
  nodes: { name: string; path: string; children?: any[] }[],
  prefix: string = "",
): { name: string; path: string }[] {
  const files: { name: string; path: string }[] = [];
  for (const node of nodes) {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.children) {
      files.push(...flattenTree(node.children, fullPath));
    } else {
      files.push({ name: node.name, path: node.path || fullPath });
    }
  }
  return files;
}

export function FileQuickOpen() {
  const open = useAppStore((s) => s.fileQuickOpenOpen);
  const setOpen = useAppStore((s) => s.setFileQuickOpenOpen);
  const tree = useFileStore((s) => s.tree);
  const openFile = useFileStore((s) => s.openFile);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    },
    [setOpen]
  );

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const target = dialog.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? dialog).focus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  const allFiles = useMemo(() => flattenTree(tree), [tree]);

  const results = useMemo((): FileResult[] => {
    const q = query.trim();
    if (!q) return allFiles.slice(0, 50).map((f) => ({ ...f, score: 0 }));
    const scored: FileResult[] = [];
    for (const file of allFiles) {
      const m = fuzzySearch(q, file.name);
      if (m) scored.push({ path: file.path, name: file.name, score: m.score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 30);
  }, [query, allFiles]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const el = resultsRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIdx(Math.max(results.length - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const file = results[selectedIdx];
      if (file) {
        void openFile(file.path);
        setOpen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div
        className="absolute inset-0 bg-surface-overlay/40 backdrop-blur-[2px] animate-fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Quick Open File"
        className="relative w-full max-w-lg surface-blur bg-surface-elevated rounded-xl overflow-hidden animate-float-in"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default hairline-top">
          <Search size={16} className="text-fg-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder="Search files by name…"
            className="flex-1 bg-transparent text-fg-primary text-sm outline-none placeholder:text-fg-muted"
            aria-label="Search files"
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-fg-muted hover:text-fg-primary transition-fast rounded hover:bg-surface-hover"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div ref={resultsRef} className="max-h-[320px] overflow-y-auto py-1 scroll-thin" role="listbox" aria-label="Files">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-fg-muted text-sm">
              No files found
            </div>
          ) : (
            results.map((file, idx) => (
              <button
                key={file.path}
                data-idx={idx}
                role="option"
                onClick={() => {
                  void openFile(file.path);
                  setOpen(false);
                }}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-fast
                  ${
                    idx === selectedIdx
                      ? "bg-accent/10 text-accent"
                      : "text-fg-secondary hover:bg-surface-elevated"
                  }`}
              >
                <FileCode2 size={14} className="shrink-0 opacity-50" />
                <span className="truncate font-mono text-xs">{file.name}</span>
                <span className="ml-auto text-[11px] text-fg-muted truncate max-w-60">{file.path}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
