import type { ComponentPropsWithRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-surface-elevated text-fg-primary hover:bg-surface-hover border border-border-subtle",
  ghost: "text-fg-secondary hover:text-fg-primary hover:bg-surface-hover",
  danger: "text-error hover:bg-error-muted border border-transparent hover:border-error/30",
  outline: "border border-border-default text-fg-primary hover:bg-surface-hover",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "text-[11px] px-2 py-1 rounded-md gap-1",
  sm: "text-xs px-2.5 py-1 rounded-lg gap-1.5",
  md: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
  lg: "text-sm px-4 py-2 rounded-lg gap-2",
};

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "btn",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <>
          <Loader2 size={size === "xs" ? 12 : size === "sm" ? 13 : 14} className="animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
}
