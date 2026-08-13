import type { ComponentPropsWithRef, ReactNode } from "react";

export type CardVariant = "default" | "elevated" | "glass" | "flat";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "rounded-xl border border-border-subtle bg-bg-secondary",
  elevated: "rounded-xl border border-border-default bg-bg-elevated shadow-glass",
  glass: "glass",
  flat: "rounded-xl bg-bg-secondary",
};

interface CardProps extends ComponentPropsWithRef<"div"> {
  variant?: CardVariant;
  hoverable?: boolean;
}

export function Card({ variant = "default", hoverable = false, className = "", ref, ...rest }: CardProps) {
  return (
    <div
      ref={ref}
      className={`${VARIANT_CLASSES[variant]} ${hoverable ? "card-hover" : ""} ${className}`}
      {...rest}
    />
  );
}

interface CardHeaderProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, icon, actions, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start gap-3 px-4 pt-3 pb-2 ${className}`}>
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        {title && <div className="text-sm font-medium text-text-primary leading-tight">{title}</div>}
        {description && <div className="text-[11px] text-text-muted mt-0.5">{description}</div>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-1">{actions}</div>}
    </div>
  );
}

export function CardContent({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`px-4 py-2 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`px-4 py-2.5 border-t border-border-subtle flex items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}
