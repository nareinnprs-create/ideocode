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
  interruptStream as tauriInterrupt,
  savePartialMessage,
  compactSession as tauriCompact,
  readFile,
  fileExists,
  type Message,
  type Session,
} from "../lib/tauri-commands";
import { notify } from "./toastStore";
import { useFileStore } from "./fileStore";
import { useAchievementStore } from "./achievementStore";
import { buildFileContext } from "../lib/context";

export type ComposerMode = "normal" | "plan" | "agent";
export type ExecutionMode = "confirm" | "auto-edit" | "plan" | "full-access";
export type ThoughtLevel = "low" | "high" | "max";

export interface MessageBranch {
  id: string;
  messages: Message[];
  parentId: string | null;
  label: string;
  created: number;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  streamingContent: string;
  streamingAssistantId: string | null;
  error: string | null;
  sessions: Session[];
  model: string;
  mode: ComposerMode;
  executionMode: ExecutionMode;
  thoughtLevel: ThoughtLevel;
  reasoningEffort: string;
  branches: MessageBranch[];
  activeBranchId: string | null;
  setModel: (model: string) => void;
  setMode: (mode: ComposerMode) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  setThoughtLevel: (level: ThoughtLevel) => void;
  setReasoningEffort: (effort: string) => void;
  sendMessage: (content: string) => Promise<void>;
  interrupt: () => Promise<void>;
  compact: () => Promise<void>;
  loadMessages: () => Promise<void>;
  clearMessages: () => Promise<void>;
  regenerate: (model?: string) => Promise<void>;
  editLast: (content: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  switchBranch: (branchId: string) => void;
  createBranch: () => void;
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
            ? {
                streamingContent: s.streamingContent + e.payload.content,
                streamingAssistantId: s.streamingAssistantId ?? e.payload.id,
              }
            : s,
        );
      });
      await listen<{ message: Message }>("chat://done", (e) => {
        useChatStore.setState((s) => {
          const existingIdx = s.messages.findIndex(
            (m) => m.id === e.payload.message.id,
          );
          const messages =
            existingIdx >= 0
              ? s.messages.map((m, i) => (i === existingIdx ? e.payload.message : m))
              : [...s.messages, e.payload.message];
          return {
            messages,
            streaming: false,
            streamingContent: "",
            streamingAssistantId: null,
            loading: false,
            error: null,
          };
        });
        void refreshSessions();
      });
      await listen<{ error: string }>("chat://error", (e) => {
        useChatStore.setState({
          streaming: false,
          streamingContent: "",
          streamingAssistantId: null,
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
  streamingAssistantId: null,
  error: null,
  sessions: [],
  model: "auto",
  mode: "normal",
  executionMode: "confirm",
  thoughtLevel: "high",
  reasoningEffort: "medium",
  branches: [],
  activeBranchId: null,
  setModel: (model) => set({ model }),
  setMode: (mode) => set({ mode }),
  setExecutionMode: (executionMode) => set({ executionMode }),
  setThoughtLevel: (thoughtLevel) => set({ thoughtLevel }),
  setReasoningEffort: (effort) => set({ reasoningEffort: effort }),

  sendMessage: async (content: string) => {
    const { model, mode, reasoningEffort, streaming } = useChatStore.getState();
    if (streaming) return;
    set((s) => ({
      loading: true,
      error: null,
      streamingContent: "",
      streamingAssistantId: null,
      messages: s.messages,
    }));
    try {
      await ensureStreamListeners();
      const fs = useFileStore.getState();
      
      const mentions = new Set<string>();
      const mentionRegex = /@([^\s]+)/g;
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        mentions.add(match[1]);
      }

      const mentionedFiles: {path: string, content: string}[] = [];
      if (mentions.size > 0) {
        const rootPath = fs.rootPath;
        for (const m of mentions) {
          if (m === fs.activeFile) continue;
          let fileContent = fs.contents[m];
          if (fileContent === undefined) {
            try {
              const isAbsolute = m.startsWith("/") || /^[a-zA-Z]:\\/.test(m);
              const fullPath = isAbsolute ? m : (rootPath ? `${rootPath}/${m}` : m);
              if (await fileExists(fullPath)) {
                fileContent = await readFile(fullPath);
              }
            } catch {
              continue;
            }
          }
          if (fileContent !== undefined) {
            mentionedFiles.push({ path: m, content: fileContent });
          }
        }
      }

      // Add context store files (non-mentioned, non-active files)
      const { useContextStore } = await import("./contextStore");
      const ctxFiles = useContextStore.getState().files;
      const activeSet = new Set(mentionedFiles.map((f) => f.path));
      if (fs.activeFile) activeSet.add(fs.activeFile);
      for (const cf of ctxFiles) {
        if (!activeSet.has(cf.path) && cf.content) {
          mentionedFiles.push({ path: cf.path, content: cf.content });
        }
      }

      const ctx = buildFileContext(content, fs.activeFile, fs.activeFile ? fs.contents[fs.activeFile] : undefined, mentionedFiles);
      const userMsg = await tauriStream(ctx?.payload ?? content, { model, mode, reasoningEffort });
      const displayMsg = ctx ? { ...userMsg, content: ctx.strip(userMsg.content) } : userMsg;
      set((s) => ({
        messages: [...s.messages, displayMsg],
        loading: false,
        streaming: true,
        streamingContent: "",
        error: null,
      }));
      useAchievementStore.getState().increment('chatMessages');
    } catch (e) {
      set({
        loading: false,
        streaming: false,
        error: `Failed to send: ${e}`,
      });
      notify("error", "Message failed to send", `${e}`);
    }
  },

  interrupt: async () => {
    const { streamingContent, streamingAssistantId } = useChatStore.getState();
    let stopped = false;
    try {
      stopped = await tauriInterrupt();
    } catch {
      stopped = false;
    }
    if (!stopped) return;
    const content = streamingContent.trim();
    if (!content) {
      set({
        streaming: false,
        loading: false,
        streamingContent: "",
        streamingAssistantId: null,
      });
      return;
    }
    let partial: Message;
    if (streamingAssistantId) {
      try {
        partial = await savePartialMessage(streamingAssistantId, content);
      } catch {
        partial = {
          id: `partial-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: Date.now(),
        };
      }
    } else {
      partial = {
        id: `partial-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: Date.now(),
      };
    }
    set((s) => ({
      messages: [...s.messages, partial],
      streaming: false,
      loading: false,
      streamingContent: "",
      streamingAssistantId: null,
    }));
    void refreshSessions();
  },

  compact: async () => {
    set({ loading: true, error: null });
    try {
      const messages = await tauriCompact();
      set({ messages, loading: false, error: null });
      notify(
        "success",
        "Conversation compacted",
        "Older turns were summarized to keep context focused.",
      );
      void refreshSessions();
    } catch (e) {
      set({ loading: false, error: `Failed to compact: ${e}` });
      notify("warning", "Compact unavailable", `${e}`);
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

  regenerate: async (_model?: string) => {
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
      set({ messages: [], streaming: false, streamingContent: "", streamingAssistantId: null, error: null });
      void refreshSessions();
    } catch (e) {
      set({ error: `Failed to clear: ${e}` });
    }
  },

  loadSession: async (id: string) => {
    try {
      const messages = await tauriLoadSession(id);
      set({ messages, streaming: false, streamingContent: "", streamingAssistantId: null, error: null });
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

  switchBranch: (branchId: string) => {
    const { branches } = useChatStore.getState();
    const branch = branches.find((b) => b.id === branchId);
    if (branch) {
      set({ messages: branch.messages, activeBranchId: branchId });
    }
  },

  createBranch: () => {
    const { messages, branches, activeBranchId } = useChatStore.getState();
    const branch: MessageBranch = {
      id: `branch-${Date.now()}`,
      messages: [...messages],
      parentId: activeBranchId,
      label: `Branch ${branches.length + 1}`,
      created: Date.now(),
    };
    set({ branches: [...branches, branch], activeBranchId: branch.id });
  },
}));
