import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  category: 'code' | 'chat' | 'git' | 'explore' | 'milestone';
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-chat', title: 'Hello World', description: 'Send your first chat message', icon: '💬', category: 'chat' },
  { id: 'first-edit', title: 'Code Surgeon', description: 'Edit a file using Cmd+K', icon: '✂️', category: 'code' },
  { id: 'first-commit', title: 'Committer', description: 'Make your first git commit', icon: '📦', category: 'git' },
  { id: '10-chats', title: 'Chatterbox', description: 'Send 10 chat messages', icon: '🗣️', category: 'chat' },
  { id: '50-chats', title: 'Conversationalist', description: 'Send 50 chat messages', icon: '🎯', category: 'chat' },
  { id: '100-chats', title: 'Chat Legend', description: 'Send 100 chat messages', icon: '🏆', category: 'chat' },
  { id: '10-edits', title: 'Refactorer', description: 'Edit files 10 times with Cmd+K', icon: '🔄', category: 'code' },
  { id: '5-commits', title: 'Version Keeper', description: 'Make 5 git commits', icon: '📋', category: 'git' },
  { id: 'first-search', title: 'Seeker', description: 'Use search for the first time', icon: '🔍', category: 'explore' },
  { id: 'workspace-open', title: 'Settled In', description: 'Open a workspace', icon: '🏠', category: 'explore' },
  { id: 'provider-setup', title: 'Connected', description: 'Configure an API provider', icon: '🔌', category: 'milestone' },
  { id: 'first-tool', title: 'Tool User', description: 'Execute an AI tool (bash/edit/read)', icon: '🔧', category: 'code' },
  { id: '10-tools', title: 'Power User', description: 'Execute 10 AI tools', icon: '⚡', category: 'code' },
  { id: 'theme-change', title: 'Fashionista', description: 'Change the app theme', icon: '🎨', category: 'explore' },
  { id: '3-sessions', title: 'Regular', description: 'Create 3 chat sessions', icon: '📝', category: 'chat' },
  { id: 'semantic-search', title: 'Deep Thinker', description: 'Use semantic search', icon: '🧠', category: 'explore' },
];

interface AchievementState {
  achievements: Achievement[];
  unlocked: Record<string, number>;
  stats: {
    chatMessages: number;
    codeEdits: number;
    commits: number;
    toolsExecuted: number;
    searches: number;
    sessions: number;
  };
  showNotification: string | null;
  unlock: (id: string) => void;
  increment: (stat: keyof AchievementState['stats'], amount?: number) => void;
  dismissNotification: () => void;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      achievements: ACHIEVEMENTS,
      unlocked: {},
      stats: {
        chatMessages: 0,
        codeEdits: 0,
        commits: 0,
        toolsExecuted: 0,
        searches: 0,
        sessions: 0,
      },
      showNotification: null,

      unlock: (id: string) => {
        const state = get();
        if (state.unlocked[id]) return;
        const achievement = ACHIEVEMENTS.find((a) => a.id === id);
        set({
          unlocked: { ...state.unlocked, [id]: Date.now() },
          showNotification: achievement ? achievement.title : null,
        });
        setTimeout(() => get().dismissNotification(), 3000);
      },

      increment: (stat, amount = 1) => {
        const state = get();
        const newValue = state.stats[stat] + amount;
        const newStats = { ...state.stats, [stat]: newValue };
        set({ stats: newStats });

        // Auto-unlock achievements based on stats
        if (newStats.chatMessages >= 1) state.unlock('first-chat');
        if (newStats.chatMessages >= 10) state.unlock('10-chats');
        if (newStats.chatMessages >= 50) state.unlock('50-chats');
        if (newStats.chatMessages >= 100) state.unlock('100-chats');
        if (newStats.codeEdits >= 1) state.unlock('first-edit');
        if (newStats.codeEdits >= 10) state.unlock('10-edits');
        if (newStats.commits >= 1) state.unlock('first-commit');
        if (newStats.commits >= 5) state.unlock('5-commits');
        if (newStats.toolsExecuted >= 1) state.unlock('first-tool');
        if (newStats.toolsExecuted >= 10) state.unlock('10-tools');
        if (newStats.searches >= 1) state.unlock('first-search');
        if (newStats.sessions >= 3) state.unlock('3-sessions');
      },

      dismissNotification: () => set({ showNotification: null }),
    }),
    { name: 'ideocode-achievements' }
  )
);
