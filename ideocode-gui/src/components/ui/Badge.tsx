import type { ReactNode } from "react";

export type BadgeTone = "default" | "accent" | "success" | "warning" | "error" | "info";
export type BadgeStyle = "solid" | "soft" | "outline";

const TONE_SOLID: Record<BadgeTone, string> = {
  default: "bg-surface-elevated text-fg-secondary border-border-subtle",
  accent: "bg-accent text-white border-transparent",
  success: "bg-success-muted text-success border-success/30",
  warning: "bg-warning-muted text-warning border-warning/30",
  error: "bg-error-muted text-error border-error/30",
  info: "bg-info-muted text-info border-info/30",
};

const TONE_SOFT: Record<BadgeTone, string> = {
  default: "bg-surface-elevated/60 text-fg-secondary border-border-subtle",
  accent: "bg-accent-subtle text-accent border-accent/25",
  success: "bg-success-muted text-success border-success/20",
  warning: "bg-warning-muted text-warning border-warning/20",
  error: "bg-error-muted text-error border-error/20",
  info: "bg-info-muted text-info border-info/20",
};

const TONE_OUTLINE: Record<BadgeTone, string> = {
  default: "bg-transparent text-fg-secondary border-border-default",
  accent: "bg-transparent text-accent border-accent/40",
  success: "bg-transparent text-success border-success/40",
  warning: "bg-transparent text-warning border-warning/40",
  error: "bg-transparent text-error border-error/40",
  info: "bg-transparent text-info border-info/40",
};

interface BadgeProps {
  tone?: BadgeTone;
  style?: BadgeStyle;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ tone = "default", style = "soft", children, className = "", dot = false }: BadgeProps) {
  const toneClasses = style === "solid" ? TONE_SOLID[tone] : style === "outline" ? TONE_OUTLINE[tone] : TONE_SOFT[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${toneClasses} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
