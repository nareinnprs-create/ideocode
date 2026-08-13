import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  labelledBy?: string;
}

const WIDTH_CLASSES: Record<NonNullable<ModalProps["width"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  labelledBy,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape" && closeOnEscape) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    },
    [open, closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const target = dialog.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? dialog).focus();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  const titleId = labelledBy ?? "idc-modal-title";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <div
        className="absolute inset-0 overlay animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${WIDTH_CLASSES[width]} rounded-xl border border-border-default bg-bg-secondary shadow-pop animate-mission-control max-h-[85vh] flex flex-col`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start gap-3 px-4 pt-4 pb-2 border-b border-border-subtle">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id={titleId} className="text-sm font-semibold text-text-primary leading-tight">
                  {title}
                </h2>
              )}
              {description && <p className="text-[11px] text-text-muted mt-1 leading-snug">{description}</p>}
            </div>
            {showCloseButton && <IconButton size="sm" label="Close dialog" onClick={onClose}><X /></IconButton>}
          </div>
        )}
        <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
