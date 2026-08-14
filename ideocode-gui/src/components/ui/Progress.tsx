interface ProgressProps {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  className?: string;
  tone?: "accent" | "success" | "warning" | "error";
}

const TONE_CLASSES = {
  accent: "bg-accent-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

export function Progress({ value = 0, max = 100, indeterminate = false, className = "", tone = "accent" }: ProgressProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : value}
      className={`h-1 w-full rounded-full bg-bg-tertiary overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${indeterminate ? "shimmer w-1/3" : TONE_CLASSES[tone]}`}
        style={indeterminate ? undefined : { width: `${pct}%` }}
      />
    </div>
  );
}
