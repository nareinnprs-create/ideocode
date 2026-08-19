import type { ReactNode } from "react";
import { X } from "lucide-react";

type TagVariant = "default" | "accent" | "success" | "warning" | "danger" | "info";

interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

const VARIANT_CLASSES: Record<TagVariant, string> = {
  default: "bg-bg-elevated text-text-secondary border-border-subtle",
  accent: "bg-accent-primary/10 text-accent-primary border-accent-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-error/10 text-error border-error/20",
  info: "bg-info/10 text-info border-info/20",
};

export function Tag({
  children,
  variant = "default",
  size = "sm",
  removable = false,
  onRemove,
  onClick,
  className = "",
}: TagProps) {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5 gap-1" : "text-[11px] px-2 py-0.5 gap-1.5";
  const interactive = onClick ? "cursor-pointer hover:opacity-80" : "";

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-medium rounded-full border ${VARIANT_CLASSES[variant]} ${sizeClasses} ${interactive} ${className}`}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 hover:opacity-60 transition-opacity"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
