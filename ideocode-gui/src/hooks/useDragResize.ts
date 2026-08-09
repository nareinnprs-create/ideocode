import { useCallback, useRef } from "react";

export interface DragResizeBind {
  onPointerDown: (e: React.PointerEvent) => void;
}

export function useDragResize(
  onDelta: (dx: number, dy: number) => void,
  cursor: "col-resize" | "row-resize",
): DragResizeBind {
  const last = useRef<{ x: number; y: number } | null>(null);
  const onDeltaRef = useRef(onDelta);
  onDeltaRef.current = onDelta;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (e.button !== 0) return;
      last.current = { x: e.clientX, y: e.clientY };

      const onMove = (ev: PointerEvent) => {
        if (!last.current) return;
        const dx = ev.clientX - last.current.x;
        const dy = ev.clientY - last.current.y;
        last.current = { x: ev.clientX, y: ev.clientY };
        if (dx !== 0 || dy !== 0) onDeltaRef.current(dx, dy);
      };
      const onUp = () => {
        last.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = cursor;
    },
    [cursor],
  );

  return { onPointerDown };
}
