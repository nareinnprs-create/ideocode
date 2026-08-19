import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  author: string;
  description: string;
  colors: ThemeColors;
  isBuiltin: boolean;
  createdAt: number;
}

const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'midnight', name: 'Midnight', author: 'IDEOCODE', description: 'Deep purple dark theme',
    colors: { bgPrimary: '#0D0B14', bgSecondary: '#161221', bgTertiary: '#1E1A2E', textPrimary: '#E8E4F0', textSecondary: '#A8A0B8', textMuted: '#6B6180', border: '#2A2440', accent: '#7C3AED', accentHover: '#6D28D9', success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'aurora', name: 'Aurora', author: 'IDEOCODE', description: 'Cyan-tinted arctic theme',
    colors: { bgPrimary: '#0B1420', bgSecondary: '#111E2E', bgTertiary: '#172838', textPrimary: '#E0F0FF', textSecondary: '#8CB4D8', textMuted: '#507090', border: '#1E3048', accent: '#06B6D4', accentHover: '#0891B2', success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'ember', name: 'Ember', author: 'IDEOCODE', description: 'Warm red-orange theme',
    colors: { bgPrimary: '#140D0D', bgSecondary: '#211212', bgTertiary: '#2E1818', textPrimary: '#F0E4E4', textSecondary: '#D8A0A0', textMuted: '#806060', border: '#402424', accent: '#EF4444', accentHover: '#DC2626', success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'forest', name: 'Forest', author: 'IDEOCODE', description: 'Natural green theme',
    colors: { bgPrimary: '#0D140D', bgSecondary: '#122112', bgTertiary: '#182E18', textPrimary: '#E4F0E4', textSecondary: '#A0D8A0', textMuted: '#608060', border: '#244024', accent: '#22C55E', accentHover: '#16A34A', success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'light', name: 'Light', author: 'IDEOCODE', description: 'Clean light theme',
    colors: { bgPrimary: '#FFFFFF', bgSecondary: '#F8F9FA', bgTertiary: '#F0F1F3', textPrimary: '#1A1A2E', textSecondary: '#555570', textMuted: '#999AAA', border: '#E0E1E6', accent: '#3B82F6', accentHover: '#2563EB', success: '#16A34A', warning: '#D97706', error: '#DC2626', info: '#2563EB' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'dracula', name: 'Dracula', author: 'Community', description: 'Classic Dracula palette',
    colors: { bgPrimary: '#282A36', bgSecondary: '#343746', bgTertiary: '#3E4155', textPrimary: '#F8F8F2', textSecondary: '#CCCFC0', textMuted: '#6272A4', border: '#44475A', accent: '#BD93F9', accentHover: '#A87DE8', success: '#50FA7B', warning: '#F1FA8C', error: '#FF5555', info: '#8BE9FD' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'nord', name: 'Nord', author: 'Community', description: 'Arctic Nord color scheme',
    colors: { bgPrimary: '#2E3440', bgSecondary: '#3B4252', bgTertiary: '#434C5E', textPrimary: '#ECEFF4', textSecondary: '#D8DEE9', textMuted: '#4C566A', border: '#4C566A', accent: '#88C0D0', accentHover: '#81A1C1', success: '#A3BE8C', warning: '#EBCB8B', error: '#BF616A', info: '#5E81AC' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'tokyo-night', name: 'Tokyo Night', author: 'Community', description: 'Tokyo Night color scheme',
    colors: { bgPrimary: '#1A1B26', bgSecondary: '#24283B', bgTertiary: '#414868', textPrimary: '#C0CAF5', textSecondary: '#A9B1D6', textMuted: '#565F89', border: '#3B4261', accent: '#7AA2F7', accentHover: '#7982A9', success: '#9ECE6A', warning: '#E0AF68', error: '#F7768E', info: '#7DCFFF' },
    isBuiltin: true, createdAt: 0,
  },
];

interface ThemeState {
  themes: ThemeDefinition[];
  activeThemeId: string;
  setTheme: (id: string) => void;
  createTheme: (theme: Omit<ThemeDefinition, 'id' | 'createdAt'>) => string;
  updateTheme: (id: string, updates: Partial<ThemeDefinition>) => void;
  deleteTheme: (id: string) => void;
  exportTheme: (id: string) => string;
  importTheme: (json: string) => boolean;
  getActiveTheme: () => ThemeDefinition;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themes: BUILTIN_THEMES,
      activeThemeId: 'midnight',

      setTheme: (id) => {
        set({ activeThemeId: id });
        const theme = [...BUILTIN_THEMES, ...get().themes].find((t) => t.id === id);
        if (theme) applyThemeColors(theme.colors);
      },

      createTheme: (theme) => {
        const id = `custom-${Date.now()}`;
        const newTheme: ThemeDefinition = { ...theme, id, createdAt: Date.now() };
        set((s) => ({ themes: [...s.themes, newTheme] }));
        return id;
      },

      updateTheme: (id, updates) => {
        set((s) => ({
          themes: s.themes.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTheme: (id) => {
        const theme = BUILTIN_THEMES.find((t) => t.id === id);
        if (theme?.isBuiltin) return;
        set((s) => ({
          themes: s.themes.filter((t) => t.id !== id),
          activeThemeId: s.activeThemeId === id ? 'midnight' : s.activeThemeId,
        }));
      },

      exportTheme: (id) => {
        const all = [...BUILTIN_THEMES, ...get().themes];
        const theme = all.find((t) => t.id === id);
        return theme ? JSON.stringify(theme, null, 2) : '{}';
      },

      importTheme: (json) => {
        try {
          const theme = JSON.parse(json) as ThemeDefinition;
          if (!theme.name || !theme.colors) return false;
          const id = `imported-${Date.now()}`;
          const newTheme = { ...theme, id, isBuiltin: false, createdAt: Date.now() };
          set((s) => ({ themes: [...s.themes, newTheme] }));
          return true;
        } catch {
          return false;
        }
      },

      getActiveTheme: () => {
        const all = [...BUILTIN_THEMES, ...get().themes];
        return all.find((t) => t.id === get().activeThemeId) || BUILTIN_THEMES[0];
      },
    }),
    { name: 'ideocode-themes' }
  )
);

function applyThemeColors(c: ThemeColors) {
  const el = document.documentElement;
  el.style.setProperty('--bg-primary', c.bgPrimary);
  el.style.setProperty('--bg-secondary', c.bgSecondary);
  el.style.setProperty('--bg-tertiary', c.bgTertiary);
  el.style.setProperty('--text-primary', c.textPrimary);
  el.style.setProperty('--text-secondary', c.textSecondary);
  el.style.setProperty('--text-muted', c.textMuted);
  el.style.setProperty('--border', c.border);
  el.style.setProperty('--accent', c.accent);
  el.style.setProperty('--accent-hover', c.accentHover);
  el.style.setProperty('--success', c.success);
  el.style.setProperty('--warning', c.warning);
  el.style.setProperty('--error', c.error);
  el.style.setProperty('--info', c.info);
  el.style.setProperty('--idc-accent-primary', c.accent);
  el.style.setProperty('--idc-accent-hover', c.accentHover);
  el.style.setProperty('--idc-glow', `${c.accent}33`);
  el.style.setProperty('--idc-glow-accent', `${c.accent}4d`);
}
