interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: "default" | "accent" | "danger";
  className?: string;
}

const VARIANT_CLASSES = {
  default: "bg-surface-elevated text-fg-secondary",
  accent: "bg-accent text-white",
  danger: "bg-error text-white",
};

export function CountBadge({ count, max = 99, variant = "default", className = "" }: CountBadgeProps) {
  if (count <= 0) return null;
  const display = count > max ? `${max}+` : String(count);

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {display}
    </span>
  );
}
