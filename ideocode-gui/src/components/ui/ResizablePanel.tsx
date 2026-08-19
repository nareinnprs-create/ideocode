import { useCallback, useRef, useState, type ReactNode } from "react";

interface ResizablePanelProps {
  direction: "horizontal" | "vertical";
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
  children: [ReactNode, ReactNode];
  className?: string;
}

export function ResizablePanel({
  direction,
  defaultSize,
  minSize = 100,
  maxSize = Infinity,
  children,
  className = "",
}: ResizablePanelProps) {
  const [size, setSize] = useState(defaultSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const isHorizontal = direction === "horizontal";
  const handleClass = isHorizontal ? "resize-handle-x" : "resize-handle-y";
  const handleStyle = isHorizontal
    ? { width: 4, cursor: "col-resize" as const }
    : { height: 4, cursor: "row-resize" as const };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      startSize.current = size;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isHorizontal, size]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const pos = isHorizontal ? e.clientX : e.clientY;
      const delta = pos - startPos.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta));
      setSize(newSize);
    },
    [isHorizontal, minSize, maxSize]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? "flex-row" : "flex-col"} ${className}`}
    >
      <div style={isHorizontal ? { width: size } : { height: size }} className="shrink-0 overflow-hidden">
        {children[0]}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`shrink-0 bg-border-subtle hover:bg-accent-primary/40 active:bg-accent-primary/60 transition-colors ${handleClass}`}
        style={handleStyle}
      />
      <div className="flex-1 overflow-hidden min-w-0 min-h-0">
        {children[1]}
      </div>
    </div>
  );
}
