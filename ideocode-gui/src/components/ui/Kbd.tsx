import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
  size?: "xs" | "sm";
}

export function Kbd({ children, size = "xs" }: KbdProps) {
  return (
    <kbd className={`px-1.5 py-0.5 rounded bg-bg-elevated font-mono text-text-secondary border border-border-subtle ${size === "xs" ? "text-[10px]" : "text-xs"}`}>
      {children}
    </kbd>
  );
}
