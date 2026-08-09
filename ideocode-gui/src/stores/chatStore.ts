import { create } from "zustand";
import {
  sendMessage as tauriSend,
  getMessages,
  clearMessages as tauriClear,
  listSessions,
  loadSession as tauriLoadSession,
  renameSession as tauriRenameSession,
  deleteSession as tauriDeleteSession,
  regenerateLastMessage as regenerateLast,
  editLastMessage,
  type Message,
  type Session,
} from "../lib/tauri-commands";
import { notify } from "./toastStore";

export type ComposerMode = "normal" | "plan" | "agent";

interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sessions: Session[];
  model: string;
  mode: ComposerMode;
  setModel: (model: string) => void;
  setMode: (mode: ComposerMode) => void;
  sendMessage: (content: string) => Promise<void>;
  loadMessages: () => Promise<void>;
  clearMessages: () => Promise<void>;
  regenerate: () => Promise<void>;
  editLast: (content: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  error: null,
  sessions: [],
  model: "auto",
  mode: "normal",
  setModel: (model) => set({ model }),
  setMode: (mode) => set({ mode }),

  sendMessage: async (content: string) => {
    const { model, mode } = useChatStore.getState();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    set((s) => ({ messages: [...s.messages, userMsg], loading: true }));

    try {
      const response = await tauriSend(content, { model, mode });
      set((s) => ({
        messages: [...s.messages, response],
        loading: false,
        error: null,
      }));
    } catch (e) {
      set({ loading: false, error: `Failed to send: ${e}` });
      notify("error", "Message failed to send", `${e}`);
      return;
    }
    // The message was delivered; failing to refresh the session list is a
    // separate, non-fatal error and must not be reported as a failed send.
    try {
      const sessions = await listSessions();
      set({ sessions });
    } catch (e) {
      set({ error: `Message sent, but session list refresh failed: ${e}` });
      notify("warning", "Session list refresh failed", `${e}`);
    }
  },

  loadMessages: async () => {
    try {
      const messages = await getMessages();
      set({ messages, error: null });
    } catch (e) {
      set({ error: `Failed to load messages: ${e}` });
    }
  },

  regenerate: async () => {
    const { messages } = useChatStore.getState();
    const lastIdx = messages.map((m) => m.role).lastIndexOf("assistant");
    if (lastIdx === -1) {
      notify("error", "Nothing to regenerate", "");
      return;
    }
    const head = messages.slice(0, lastIdx);
    set({ messages: head, loading: true, error: null });
    try {
      const assistant = await regenerateLast();
      set({ messages: [...head, assistant], loading: false, error: null });
      const sessions = await listSessions();
      set({ sessions });
    } catch (e) {
      set({ loading: false, error: `Failed to regenerate: ${e}` });
      notify("error", "Failed to regenerate", `${e}`);
    }
  },

  editLast: async (content: string) => {
    const { messages } = useChatStore.getState();
    const lastIdx = messages.map((m) => m.role).lastIndexOf("user");
    if (lastIdx === -1) {
      notify("error", "Nothing to edit", "");
      return;
    }
    const head = messages.slice(0, lastIdx);
    const editedUser = { ...messages[lastIdx], content };
    set({ messages: [...head, editedUser], loading: true, error: null });
    try {
      const assistant = await editLastMessage(content);
      set({
        messages: [...head, editedUser, assistant],
        loading: false,
        error: null,
      });
      const sessions = await listSessions();
      set({ sessions });
    } catch (e) {
      set({ loading: false, error: `Failed to edit: ${e}` });
      notify("error", "Failed to edit message", `${e}`);
    }
  },

  clearMessages: async () => {
    try {
      await tauriClear();
      set({ messages: [], error: null });
      const sessions = await listSessions();
      set({ sessions });
    } catch (e) {
      set({ error: `Failed to clear: ${e}` });
    }
  },

  loadSession: async (id: string) => {
    try {
      const messages = await tauriLoadSession(id);
      set({ messages, error: null });
      notify("success", "Session resumed", "");
    } catch (e) {
      set({ error: `Failed to resume session: ${e}` });
      notify("error", "Failed to resume session", `${e}`);
    }
  },

  renameSession: async (id: string, title: string) => {
    try {
      await tauriRenameSession(id, title);
      const sessions = await listSessions();
      set({ sessions, error: null });
    } catch (e) {
      set({ error: `Failed to rename session: ${e}` });
      notify("error", "Failed to rename session", `${e}`);
    }
  },

  loadSessions: async () => {
    try {
      const sessions = await listSessions();
      set({ sessions, error: null });
    } catch (e) {
      set({ error: `Failed to load sessions: ${e}` });
    }
  },

  deleteSession: async (id: string) => {
    try {
      await tauriDeleteSession(id);
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    } catch (e) {
      set({ error: `Failed to delete session: ${e}` });
      notify("error", "Failed to delete session", `${e}`);
    }
  },
}));
