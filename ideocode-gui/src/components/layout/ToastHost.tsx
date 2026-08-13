import { useToastStore } from "../../stores/toastStore";
import { Toast } from "../ui/Toast";

export function ToastHost() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed top-3 right-3 z-[60] flex flex-col gap-2 w-72 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
