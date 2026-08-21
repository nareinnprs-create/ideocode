import { useState, useEffect } from "react";
import { X, FileCode2, Copy, XCircle, FileX } from "lucide-react";
import { useFileStore } from "../../stores/fileStore";
import { useAppStore } from "../../stores/appStore";
import { basename } from "../../lib/tabs";

export function TabBar() {
  const openFiles = useFileStore((s) => s.openFiles);
  const activeFile = useFileStore((s) => s.activeFile);
  const dirty = useFileStore((s) => s.dirty);
  const openFile = useFileStore((s) => s.openFile);
  const closeFile = useFileStore((s) => s.closeFile);
  const setSplitFile = useAppStore((s) => s.setSplitFile);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  if (openFiles.length === 0) return null;

  const closeOthers = (path: string) => {
    openFiles.forEach((f) => { if (f !== path) closeFile(f); });
    setContextMenu(null);
  };

  const closeAll = () => {
    openFiles.forEach((f) => closeFile(f));
    setContextMenu(null);
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path).catch(() => {});
    setContextMenu(null);
  };

  const openInSplit = (path: string) => {
    setSplitFile(path);
    setContextMenu(null);
  };

  return (
    <div className="flex items-center h-9 surface-blur bg-surface/60 border-b border-border-subtle overflow-x-auto scroll-thin shrink-0" role="tablist" aria-label="Open files">
      <div className="flex h-full items-stretch">
        {openFiles.map((path) => {
          const isActive = path === activeFile;
          const isDirty = dirty[path] === true;
          const name = basename(path);
          return (
            <div
              key={path}
              role="tab"
              aria-selected={isActive}
              onClick={() => openFile(path)}
              onAuxClick={(e) => {
                if (e.button === 1) closeFile(path);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, path });
              }}
              className={`group relative flex items-center gap-1.5 px-3 text-xs transition-all duration-150 cursor-pointer select-none
                ${
                  isActive
                    ? "bg-surface text-fg-primary"
                    : "bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg-secondary"
                }`}
            >
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[2px] rounded-b-sm accent-gradient-bg shadow-[0_2px_10px_-2px_var(--idc-glow)]" />
              )}
              <FileCode2
                size={13}
                className={isActive ? "text-accent" : "text-fg-muted"}
              />
              <span className="font-mono whitespace-nowrap">{name}</span>
              {isDirty ? (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-warning shrink-0"
                  title="Unsaved changes"
                >
                  <span className="sr-only">Unsaved changes</span>
                </span>
              ) : (
                <button
                  title={`Close ${name}`}
                  aria-label={`Close ${name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(path);
                  }}
                  className="ml-0.5 p-0.5 rounded text-fg-muted hover:text-fg-primary hover:bg-surface-elevated transition-fast opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] py-1 rounded-lg border border-border-subtle bg-surface shadow-xl animate-fade-in"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <ContextMenuItem
            icon={<FileCode2 size={13} />}
            label="Open in Split"
            onClick={() => openInSplit(contextMenu.path)}
          />
          <ContextMenuItem
            icon={<Copy size={13} />}
            label="Copy Path"
            onClick={() => copyPath(contextMenu.path)}
          />
          <div className="my-1 border-t border-border-subtle" />
          <ContextMenuItem
            icon={<XCircle size={13} />}
            label="Close Others"
            onClick={() => closeOthers(contextMenu.path)}
            disabled={openFiles.length <= 1}
          />
          <ContextMenuItem
            icon={<FileX size={13} />}
            label="Close All"
            onClick={closeAll}
          />
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-fg-secondary hover:bg-accent/10 hover:text-accent transition-fast disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  );
}
