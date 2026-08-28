import { create } from "zustand";
import { sshConnect, sshDisconnect } from "../lib/tauri-commands";

export type RemoteHostType = "ssh" | "wsl" | "docker";
export type RemoteHostStatus = "disconnected" | "connecting" | "connected" | "error";

export interface RemoteHostConfig {
  sshKey?: string;
  dockerId?: string;
  wslDistro?: string;
}

export interface RemoteHost {
  id: string;
  name: string;
  type: RemoteHostType;
  host: string;
  port: number;
  user: string;
  status: RemoteHostStatus;
  lastConnected?: number;
  config: RemoteHostConfig;
}

interface RemoteState {
  hosts: RemoteHost[];
}

interface RemoteActions {
  add: (host: Omit<RemoteHost, "id" | "status">) => RemoteHost;
  update: (id: string, updates: Partial<Omit<RemoteHost, "id">>) => void;
  remove: (id: string) => void;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => void;
  getConnected: () => RemoteHost[];
}

export type RemoteStore = RemoteState & RemoteActions;

const STORAGE_KEY = "idc-remote-v2";

function loadState(): RemoteState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hosts: (parsed.hosts ?? []) as RemoteHost[],
      };
    }
  } catch {}
  return { hosts: [] };
}

function saveState(state: RemoteState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `remote-${Date.now()}-${idCounter}`;
}

export const useRemoteStore = create<RemoteStore>((set, get) => ({
  ...loadState(),

  add: (host) => {
    const newHost: RemoteHost = {
      ...host,
      id: makeId(),
      status: "disconnected",
    };
    const hosts = [...get().hosts, newHost];
    set({ hosts });
    saveState({ hosts });
    return newHost;
  },

  update: (id, updates) => {
    const hosts = get().hosts.map((h) =>
      h.id === id ? { ...h, ...updates } : h,
    );
    set({ hosts });
    saveState({ hosts });
  },

  remove: (id) => {
    const hosts = get().hosts.filter((h) => h.id !== id);
    set({ hosts });
    saveState({ hosts });
  },

  connect: async (id) => {
    const hosts = get().hosts.map((h) =>
      h.id === id ? { ...h, status: "connecting" as RemoteHostStatus } : h,
    );
    set({ hosts });
    saveState({ hosts });

    try {
      const host = get().hosts.find((h) => h.id === id);
      if (!host) throw new Error("Host not found");

      if (host.type === "ssh") {
        const ok = await sshConnect(host.host, host.port, host.user, host.config.sshKey);
        if (!ok) throw new Error("SSH connection failed");
      } else {
        // WSL/Docker connection handling is not wired to a backend yet.
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      const updated = get().hosts.map((h) =>
        h.id === id
          ? { ...h, status: "connected" as RemoteHostStatus, lastConnected: Date.now() }
          : h,
      );
      set({ hosts: updated });
      saveState({ hosts: updated });
    } catch {
      const updated = get().hosts.map((h) =>
        h.id === id ? { ...h, status: "error" as RemoteHostStatus } : h,
      );
      set({ hosts: updated });
      saveState({ hosts: updated });
    }
  },

  disconnect: (id) => {
    const host = get().hosts.find((h) => h.id === id);
    if (host?.type === "ssh") {
      const key = `${host.user}@${host.host}:${host.port}`;
      sshDisconnect(key).catch((err) => {
        console.error("Failed to disconnect SSH host:", err);
      });
    }
    const hosts = get().hosts.map((h) =>
      h.id === id ? { ...h, status: "disconnected" as RemoteHostStatus } : h,
    );
    set({ hosts });
    saveState({ hosts });
  },

  getConnected: () => get().hosts.filter((h) => h.status === "connected"),
}));
