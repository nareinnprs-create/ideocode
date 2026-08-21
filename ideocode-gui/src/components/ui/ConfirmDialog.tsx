import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      width="sm"
      showCloseButton={false}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 border ${
            danger ? "bg-error-muted border-error/30 text-error" : "bg-accent-subtle border-accent/25 text-accent"
          }`}
        >
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-fg-primary leading-tight">{title}</div>
          {description && <div className="text-xs text-fg-secondary mt-1 leading-relaxed">{description}</div>}
        </div>
      </div>
    </Modal>
  );
}
