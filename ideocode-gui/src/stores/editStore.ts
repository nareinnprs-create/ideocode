import { create } from "zustand";
import { useFileStore } from "./fileStore";
import { notify } from "./toastStore";

export interface FileEdit {
  id: string;
  path: string;
  original: string;
  modified: string;
  status: "pending" | "accepted" | "rejected";
}

interface EditState {
  edits: FileEdit[];
  stageEdit: (path: string, original: string, modified: string) => void;
  acceptEdit: (id: string) => Promise<void>;
  rejectEdit: (id: string) => void;
  acceptAll: () => Promise<void>;
  rejectAll: () => void;
  clearEdits: () => void;
}

export const useEditStore = create<EditState>((set, get) => ({
  edits: [],

  stageEdit: (path, original, modified) => {
    set((state) => {
      // Remove any existing pending edit for this file
      const filtered = state.edits.filter((e) => !(e.path === path && e.status === "pending"));
      return {
        edits: [
          ...filtered,
          {
            id: crypto.randomUUID(),
            path,
            original,
            modified,
            status: "pending",
          },
        ],
      };
    });
  },

  acceptEdit: async (id) => {
    const { edits } = get();
    const edit = edits.find((e) => e.id === id);
    if (!edit || edit.status !== "pending") return;

    try {
      const fs = useFileStore.getState();
      fs.setContent(edit.path, edit.modified);
      
      set((state) => ({
        edits: state.edits.map((e) =>
          e.id === id ? { ...e, status: "accepted" } : e
        ),
      }));
    } catch (err) {
      notify("error", "Failed to apply edit", String(err));
    }
  },

  rejectEdit: (id) => {
    set((state) => ({
      edits: state.edits.map((e) =>
        e.id === id ? { ...e, status: "rejected" } : e
      ),
    }));
  },

  acceptAll: async () => {
    const { edits, acceptEdit } = get();
    const pending = edits.filter((e) => e.status === "pending");
    for (const edit of pending) {
      await acceptEdit(edit.id);
    }
  },

  rejectAll: () => {
    set((state) => ({
      edits: state.edits.map((e) =>
        e.status === "pending" ? { ...e, status: "rejected" } : e
      ),
    }));
  },

  clearEdits: () => set({ edits: [] }),
}));
