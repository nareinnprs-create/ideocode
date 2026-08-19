import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualList<T>({ items, itemHeight, renderItem, className = "", overscan = 5 }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height: "100%" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div
              key={actualIndex}
              style={{
                position: "absolute",
                top: actualIndex * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
