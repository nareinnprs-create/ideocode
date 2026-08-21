import { useEffect, useRef, useState, type ReactNode } from "react";

interface HoverCardProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  delay?: number;
  width?: number;
}

export function HoverCard({
  trigger,
  children,
  align = "start",
  side = "bottom",
  delay = 400,
  width = 320,
}: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const alignClass =
    align === "center"
      ? "left-1/2 -translate-x-1/2"
      : align === "end"
        ? "right-0"
        : "left-0";

  const sideClass = side === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      {open && (
        <div
          role="tooltip"
          className={`absolute z-[80] ${sideClass} ${alignClass} animate-scale-in`}
          style={{ width }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="rounded-xl border border-border-subtle bg-surface-elevated shadow-pop p-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
