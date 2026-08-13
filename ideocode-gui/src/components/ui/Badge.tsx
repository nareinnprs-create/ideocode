import type { ReactNode } from "react";

export type BadgeTone = "default" | "accent" | "success" | "warning" | "error" | "info";
export type BadgeStyle = "solid" | "soft" | "outline";

const TONE_SOLID: Record<BadgeTone, string> = {
  default: "bg-bg-elevated text-text-secondary border-border-subtle",
  accent: "bg-accent-primary text-white border-transparent",
  success: "bg-success/20 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  error: "bg-error/15 text-error border-error/30",
  info: "bg-info/15 text-info border-info/30",
};

const TONE_SOFT: Record<BadgeTone, string> = {
  default: "bg-bg-elevated/60 text-text-secondary border-border-subtle",
  accent: "bg-accent-primary/15 text-accent-primary border-accent-primary/25",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
  info: "bg-info/10 text-info border-info/20",
};

const TONE_OUTLINE: Record<BadgeTone, string> = {
  default: "bg-transparent text-text-secondary border-border-default",
  accent: "bg-transparent text-accent-primary border-accent-primary/40",
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
