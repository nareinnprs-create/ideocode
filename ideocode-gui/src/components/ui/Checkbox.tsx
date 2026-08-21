import type { ComponentPropsWithRef, ReactNode } from "react";
import { Check } from "lucide-react";

interface CheckboxProps extends ComponentPropsWithRef<"input"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className = "",
  ref,
  ...rest
}: CheckboxProps) {
  return (
    <label className={`group flex items-start gap-2.5 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only"
        {...rest}
      />
      <span
        aria-hidden="true"
        className={[
          "inline-flex items-center justify-center w-4 h-4 rounded border mt-0.5 shrink-0 transition-all duration-150",
          checked
            ? "bg-accent border-accent"
            : "border-border-default bg-surface group-hover:border-fg-muted",
          disabled ? "" : "group-hover:border-fg-muted",
        ].join(" ")}
      >
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5 min-w-0">
          {label && <span className="text-sm text-fg-primary leading-tight">{label}</span>}
          {description && <span className="text-[11px] text-fg-muted leading-snug">{description}</span>}
        </span>
      )}
    </label>
  );
}
