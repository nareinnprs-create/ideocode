import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import {
  streamChat as tauriStream,
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
  streaming: boolean;
  streamingContent: string;
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

async function refreshSessions() {
  try {
    const sessions = await listSessions();
    useChatStore.setState({ sessions });
  } catch (e) {
    useChatStore.setState({ error: `Session list refresh failed: ${e}` });
    notify("warning", "Session list refresh failed", `${e}`);
  }
}

let listenersReady: Promise<void> | null = null;

function ensureStreamListeners(): Promise<void> {
  if (!listenersReady) {
    listenersReady = (async () => {
      await listen<{ id: string; content: string }>("chat://delta", (e) => {
        useChatStore.setState((s) =>
          s.streaming
            ? { streamingContent: s.streamingContent + e.payload.content }
            : s,
        );
      });
      await listen<{ message: Message }>("chat://done", (e) => {
        useChatStore.setState((s) => ({
          messages: [...s.messages, e.payload.message],
          streaming: false,
          streamingContent: "",
          loading: false,
          error: null,
        }));
        void refreshSessions();
      });
      await listen<{ error: string }>("chat://error", (e) => {
        useChatStore.setState({
          streaming: false,
          streamingContent: "",
          loading: false,
          error: `Failed to stream response: ${e.payload.error}`,
        });
        notify("error", "Stream failed", e.payload.error);
      });
    })();
  }
  return listenersReady;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  streaming: false,
  streamingContent: "",
  error: null,
  sessions: [],
  model: "auto",
  mode: "normal",
  setModel: (model) => set({ model }),
  setMode: (mode) => set({ mode }),

  sendMessage: async (content: string) => {
    const { model, mode, streaming } = useChatStore.getState();
    if (streaming) return;
    set((s) => ({
      loading: true,
      error: null,
      streamingContent: "",
      messages: s.messages,
    }));
    try {
      await ensureStreamListeners();
      const userMsg = await tauriStream(content, { model, mode });
      set((s) => ({
        messages: [...s.messages, userMsg],
        loading: false,
        streaming: true,
        streamingContent: "",
        error: null,
      }));
    } catch (e) {
      set({
        loading: false,
        streaming: false,
        error: `Failed to send: ${e}`,
      });
      notify("error", "Message failed to send", `${e}`);
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
      void refreshSessions();
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
      void refreshSessions();
    } catch (e) {
      set({ loading: false, error: `Failed to edit: ${e}` });
      notify("error", "Failed to edit message", `${e}`);
    }
  },

  clearMessages: async () => {
    try {
      await tauriClear();
      set({ messages: [], streaming: false, streamingContent: "", error: null });
      void refreshSessions();
    } catch (e) {
      set({ error: `Failed to clear: ${e}` });
    }
  },

  loadSession: async (id: string) => {
    try {
      const messages = await tauriLoadSession(id);
      set({ messages, streaming: false, streamingContent: "", error: null });
      notify("success", "Session resumed", "");
    } catch (e) {
      set({ error: `Failed to resume session: ${e}` });
      notify("error", "Failed to resume session", `${e}`);
    }
  },

  renameSession: async (id: string, title: string) => {
    try {
      await tauriRenameSession(id, title);
      void refreshSessions();
      set({ error: null });
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
