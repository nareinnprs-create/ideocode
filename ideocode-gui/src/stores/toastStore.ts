import { create } from "zustand";

export type ToastType = "info" | "success" | "error" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  notify: (type: ToastType, title: string, description?: string) => void;
  dismissToast: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notify: (type, title, description) => {
    const id = `toast-${Date.now()}-${counter++}`;
    set((s) => ({
      toasts: [...s.toasts.slice(-4), { id, type, title, description }],
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const notify = useToastStore.getState().notify;
