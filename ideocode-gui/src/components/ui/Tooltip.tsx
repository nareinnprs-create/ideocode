import type { ReactNode } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  className?: string;
}

const POSITION_CLASS: Record<TooltipPosition, string> = {
  top: "",
  bottom: "tooltip-bottom",
  left: "tooltip-left",
  right: "tooltip-right",
};

export function Tooltip({ label, children, position = "top", className = "" }: TooltipProps) {
  return (
    <span className={`tooltip-trigger inline-flex ${className}`}>
      {children}
      <span className={`tooltip ${POSITION_CLASS[position]}`} role="tooltip">
        {label}
      </span>
    </span>
  );
}
