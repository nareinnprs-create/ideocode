import { create } from "zustand";
import {
  sendMessage as tauriSend,
  getMessages,
  clearMessages as tauriClear,
  listSessions,
  deleteSession as tauriDeleteSession,
  type Message,
  type Session,
} from "../lib/tauri-commands";

interface ChatState {
  messages: Message[];
  loading: boolean;
  sessions: Session[];
  sendMessage: (content: string) => Promise<void>;
  loadMessages: () => Promise<void>;
  clearMessages: () => Promise<void>;
  loadSessions: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  loading: false,
  sessions: [],

  sendMessage: async (content: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    set((s) => ({ messages: [...s.messages, userMsg], loading: true }));

    try {
      const response = await tauriSend(content);
      set((s) => ({ messages: [...s.messages, response], loading: false }));
      const sessions = await listSessions();
      set({ sessions });
    } catch (e) {
      console.error("Failed to send:", e);
      set({ loading: false });
    }
  },

  loadMessages: async () => {
    try {
      const messages = await getMessages();
      set({ messages });
    } catch (e) {
      console.error("Failed to load messages:", e);
    }
  },

  clearMessages: async () => {
    try {
      await tauriClear();
      set({ messages: [] });
      const sessions = await listSessions();
      set({ sessions });
    } catch (e) {
      console.error("Failed to clear:", e);
    }
  },

  loadSessions: async () => {
    try {
      const sessions = await listSessions();
      set({ sessions });
    } catch (e) {
      console.error("Failed to load sessions:", e);
    }
  },

  deleteSession: async (id: string) => {
    try {
      await tauriDeleteSession(id);
      set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  },
}));
