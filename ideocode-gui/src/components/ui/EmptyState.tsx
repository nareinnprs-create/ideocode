import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className = "", compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-4 ${compact ? "py-6" : "py-12"} ${className}`}>
      {icon && (
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-surface-elevated/60 border border-border-subtle text-fg-muted mb-3">
          {icon}
        </div>
      )}
      <div className={`font-medium text-fg-primary ${compact ? "text-xs" : "text-sm"}`}>{title}</div>
      {description && (
        <div className={`text-fg-muted mt-1 max-w-xs ${compact ? "text-[11px]" : "text-xs"} leading-relaxed`}>
          {description}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
