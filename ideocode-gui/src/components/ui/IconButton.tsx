import type { ComponentPropsWithRef } from "react";

export type IconButtonSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  xs: "p-1 rounded-md",
  sm: "p-1.5 rounded-md",
  md: "p-2 rounded-lg",
  lg: "p-2.5 rounded-lg",
};

interface IconButtonProps extends ComponentPropsWithRef<"button"> {
  size?: IconButtonSize;
  label: string;
  variant?: "ghost" | "filled" | "danger" | "outline";
}

export function IconButton({
  size = "md",
  label,
  variant = "ghost",
  className = "",
  children,
  ref,
  ...rest
}: IconButtonProps) {
  const variantClasses =
    variant === "filled"
      ? "bg-accent-primary text-white hover:bg-accent-hover"
      : variant === "danger"
        ? "text-error hover:bg-error/10 hover:text-error"
        : variant === "outline"
          ? "text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-bg-hover"
          : "text-text-muted hover:text-text-primary hover:bg-bg-hover";

  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={`btn-icon ${SIZE_CLASSES[size]} ${variantClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
