import { X, FileCode2 } from "lucide-react";
import { useFileStore } from "../../stores/fileStore";
import { basename } from "../../lib/tabs";

export function TabBar() {
  const openFiles = useFileStore((s) => s.openFiles);
  const activeFile = useFileStore((s) => s.activeFile);
  const dirty = useFileStore((s) => s.dirty);
  const openFile = useFileStore((s) => s.openFile);
  const closeFile = useFileStore((s) => s.closeFile);

  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center h-9 bg-bg-secondary border-b border-border-subtle overflow-x-auto scroll-thin shrink-0">
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
              className={`group relative flex items-center gap-1.5 px-3 text-xs transition-all duration-150 cursor-pointer select-none
                ${
                  isActive
                    ? "bg-bg-primary text-text-primary"
                    : "bg-bg-secondary text-text-muted hover:bg-bg-hover hover:text-text-secondary"
                }`}
            >
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-0.5 bg-accent-primary" />
              )}
              <FileCode2
                size={13}
                className={isActive ? "text-accent-primary" : "text-text-muted"}
              />
              <span className="font-mono whitespace-nowrap">{name}</span>
              {isDirty ? (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-warning shrink-0"
                  title="Unsaved changes"
                />
              ) : (
                <button
                  title={`Close ${name}`}
                  aria-label={`Close ${name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(path);
                  }}
                  className="ml-0.5 p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-fast opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
