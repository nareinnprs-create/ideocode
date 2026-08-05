import { useToastStore, type Toast, type ToastType } from "../../stores/toastStore";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

const TYPE_STYLES: Record<ToastType, { icon: typeof Info; text: string }> = {
  success: { icon: CheckCircle2, text: "text-success" },
  error: { icon: AlertCircle, text: "text-error" },
  warning: { icon: AlertTriangle, text: "text-warning" },
  info: { icon: Info, text: "text-info" },
};

export function ToastHost() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed top-3 right-3 z-[60] flex flex-col gap-2 w-72 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, text } = TYPE_STYLES[toast.type];

  return (
    <div className="pointer-events-auto glass-elevated rounded-lg border border-border-subtle shadow-lg animate-slide-up">
      <div className="flex items-start gap-2 px-3 py-2.5">
        <Icon size={16} className={`shrink-0 mt-0.5 ${text}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-text-primary">
            {toast.title}
          </div>
          {toast.description && (
            <div className="text-[11px] text-text-muted mt-0.5 break-words">
              {toast.description}
            </div>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-0.5 text-text-muted hover:text-text-primary transition-fast"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
