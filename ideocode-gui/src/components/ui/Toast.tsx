import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import type { ToastType } from "../../stores/toastStore";

const TYPE_ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />,
  error: <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />,
  info: <Info size={16} className="text-info shrink-0 mt-0.5" />,
};

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: ReactNode;
  onDismiss: (id: string) => void;
}

export function Toast({ id, type, title, description, action, onDismiss }: ToastProps) {
  return (
    <div className="pointer-events-auto glass-elevated rounded-lg border border-border-subtle shadow-lg animate-slide-up">
      <div className="flex items-start gap-2 px-3 py-2.5">
        {TYPE_ICONS[type]}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-text-primary">{title}</div>
          {description && <div className="text-[11px] text-text-muted mt-0.5 break-words">{description}</div>}
          {action && <div className="mt-1.5">{action}</div>}
        </div>
        <button
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          className="p-0.5 text-text-muted hover:text-text-primary transition-fast"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
