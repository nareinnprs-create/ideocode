import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DropdownItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  width?: number;
  label?: string;
}

export function DropdownMenu({
  trigger,
  items,
  align = "end",
  width,
  label = "Dropdown",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
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

  const alignClass = align === "end" ? "right-0" : "left-0";

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 min-w-48 py-1 rounded-lg border border-border-default bg-bg-elevated shadow-pop animate-scale-in ${alignClass}`}
          style={width ? { width } : undefined}
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
                      ? "text-error hover:bg-error/10"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
                  activeIndex === index && !item.disabled
                    ? item.danger
                      ? "bg-error/10"
                      : "bg-bg-hover"
                    : "",
                ].join(" ")}
              >
                {item.icon && (
                  <span className="shrink-0 flex items-center">{item.icon}</span>
                )}
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.shortcut && (
                  <span className="shrink-0 text-[11px] font-mono text-text-muted">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
