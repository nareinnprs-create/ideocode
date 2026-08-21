import { useEffect, useRef, useState, type ReactNode } from "react";

export interface ContextMenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  children: ReactNode;
  items: ContextMenuItem[];
  label?: string;
}

export function ContextMenu({ children, items, label = "Context menu" }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const enabled = items
        .map((it, i) => ({ it, i }))
        .filter((x) => !x.it.disabled && !x.it.separator);
      if (enabled.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = enabled.findIndex((x) => x.i === activeIndex);
        setActiveIndex(enabled[(idx + 1) % enabled.length].i);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = enabled.findIndex((x) => x.i === activeIndex);
        setActiveIndex(enabled[(idx - 1 + enabled.length) % enabled.length].i);
      } else if (e.key === "Enter" && items[activeIndex] && !items[activeIndex].disabled) {
        e.preventDefault();
        items[activeIndex].onSelect?.();
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, items, activeIndex]);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPos({ x: e.clientX, y: e.clientY });
    setActiveIndex(0);
    setOpen(true);
  };

  if (!open) {
    return (
      <div ref={rootRef} onContextMenu={onContextMenu} className="contents">
        {children}
      </div>
    );
  }

  return (
    <div ref={rootRef} onContextMenu={onContextMenu} className="contents">
      {children}
      <div
        ref={menuRef}
        role="menu"
        aria-label={label}
        className="fixed z-[100] min-w-48 py-1 rounded-lg border border-border-subtle bg-surface-elevated shadow-pop animate-scale-in"
        style={{ left: pos.x, top: pos.y }}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return (
              <div
                key={item.id}
                className="my-1 border-t border-border-subtle"
                role="separator"
              />
            );
          }
          return (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect?.();
                setOpen(false);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors duration-100",
                item.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : item.danger
                    ? "text-error hover:bg-error-muted"
                    : "text-fg-secondary hover:text-fg-primary hover:bg-surface-hover",
                activeIndex === index && !item.disabled
                  ? item.danger
                    ? "bg-error-muted"
                    : "bg-surface-hover"
                  : "",
              ].join(" ")}
            >
              {item.icon && (
                <span className="shrink-0 flex items-center">{item.icon}</span>
              )}
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.shortcut && (
                <span className="shrink-0 text-[11px] font-mono text-fg-muted">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
