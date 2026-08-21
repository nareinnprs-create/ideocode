import type { ComponentPropsWithRef, ReactNode } from "react";

interface ToggleProps extends ComponentPropsWithRef<"button"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className = "",
  ref,
  ...rest
}: ToggleProps) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`group flex items-start gap-3 text-left w-full ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      {...rest}
    >
      <span
        className={[
          "relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 mt-0.5",
          checked
            ? "bg-accent border-accent"
            : "bg-surface-elevated border-border-default group-hover:border-fg-muted",
          disabled ? "cursor-not-allowed" : "",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-4" : "",
          ].join(" ")}
        />
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5 min-w-0">
          {label && <span className="text-sm text-fg-primary leading-tight">{label}</span>}
          {description && <span className="text-[11px] text-fg-muted leading-snug">{description}</span>}
        </span>
      )}
    </button>
  );
}
