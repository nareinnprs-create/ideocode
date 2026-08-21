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
  accentMuted: string;
  accentSubtle: string;
  accentEmphasis: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  error: string;
  errorMuted: string;
  info: string;
  infoMuted: string;
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
    id: 'electric-violet', name: 'Electric Violet', author: 'IDEOCODE', description: 'Light-first Electric Violet theme',
    colors: { bgPrimary: '#FEFEFE', bgSecondary: '#FFFFFF', bgTertiary: '#F6F5F8', textPrimary: '#1C1925', textSecondary: '#5A5470', textMuted: '#8782A0', border: '#E6E4EC', accent: '#8B5CF6', accentHover: '#7C3AED', accentMuted: '#A78BFA', accentSubtle: '#F0ECFE', accentEmphasis: '#6D28D9', success: '#10B981', successMuted: '#ECFDF5', warning: '#F59E0B', warningMuted: '#FFFBEB', error: '#EF4444', errorMuted: '#FEF2F2', info: '#3B82F6', infoMuted: '#EFF6FF' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'electric-violet-dark', name: 'Electric Violet Dark', author: 'IDEOCODE', description: 'Dark Electric Violet theme',
    colors: { bgPrimary: '#0E0B16', bgSecondary: '#13101C', bgTertiary: '#1A1526', textPrimary: '#F4F2FA', textSecondary: '#B0A8C8', textMuted: '#6E6490', border: '#2A2440', accent: '#A78BFA', accentHover: '#C4B5FD', accentMuted: '#8B5CF6', accentSubtle: '#1E1640', accentEmphasis: '#DDD6FE', success: '#34D399', successMuted: '#0D2818', warning: '#FBBF24', warningMuted: '#2A1F0A', error: '#F87171', errorMuted: '#2A0F0F', info: '#60A5FA', infoMuted: '#0F1A2A' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'midnight', name: 'Midnight', author: 'IDEOCODE', description: 'Deep purple dark theme',
    colors: { bgPrimary: '#0D0B14', bgSecondary: '#161221', bgTertiary: '#1E1A2E', textPrimary: '#E8E4F0', textSecondary: '#A8A0B8', textMuted: '#6B6180', border: '#2A2440', accent: '#7C3AED', accentHover: '#6D28D9', accentMuted: '#A78BFA', accentSubtle: '#1E1640', accentEmphasis: '#DDD6FE', success: '#22C55E', successMuted: '#0D2818', warning: '#F59E0B', warningMuted: '#2A1F0A', error: '#EF4444', errorMuted: '#2A0F0F', info: '#3B82F6', infoMuted: '#0F1A2A' },
    isBuiltin: true, createdAt: 0,
  },
  {
    id: 'light', name: 'Clean Light', author: 'IDEOCODE', description: 'Clean light theme',
    colors: { bgPrimary: '#FFFFFF', bgSecondary: '#F9FAFB', bgTertiary: '#F3F4F6', textPrimary: '#111827', textSecondary: '#4B5563', textMuted: '#9CA3AF', border: '#E5E7EB', accent: '#3B82F6', accentHover: '#2563EB', accentMuted: '#93C5FD', accentSubtle: '#EFF6FF', accentEmphasis: '#1D4ED8', success: '#10B981', successMuted: '#ECFDF5', warning: '#F59E0B', warningMuted: '#FFFBEB', error: '#EF4444', errorMuted: '#FEF2F2', info: '#3B82F6', infoMuted: '#EFF6FF' },
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

export type ThemeStore = ThemeState & { init: () => void };

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themes: BUILTIN_THEMES,
      activeThemeId: 'electric-violet',

      init: () => {
        const state = get();
        const all = [...BUILTIN_THEMES, ...state.themes];
        const theme = all.find((t) => t.id === state.activeThemeId) || BUILTIN_THEMES[0];
        applyThemeColors(theme.colors);
      },

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
          activeThemeId: s.activeThemeId === id ? 'electric-violet' : s.activeThemeId,
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

function isColorDark(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function applyThemeColors(c: ThemeColors) {
  const el = document.documentElement;

  // Core surfaces
  el.style.setProperty('--idc-bg-primary', c.bgPrimary);
  el.style.setProperty('--idc-bg-secondary', c.bgSecondary);
  el.style.setProperty('--idc-bg-tertiary', c.bgTertiary);
  el.style.setProperty('--idc-bg-elevated', c.bgSecondary);
  el.style.setProperty('--idc-bg-hover', c.bgTertiary);
  el.style.setProperty('--idc-bg-overlay', `${c.bgPrimary}cc`);

  // Text hierarchy
  el.style.setProperty('--idc-text-primary', c.textPrimary);
  el.style.setProperty('--idc-text-secondary', c.textSecondary);
  el.style.setProperty('--idc-text-muted', c.textMuted);

  // Semantic surface aliases
  el.style.setProperty('--idc-fg-primary', c.textPrimary);
  el.style.setProperty('--idc-fg-secondary', c.textSecondary);
  el.style.setProperty('--idc-fg-muted', c.textMuted);
  el.style.setProperty('--idc-surface', c.bgSecondary);
  el.style.setProperty('--idc-surface-hover', c.bgTertiary);
  el.style.setProperty('--idc-surface-elevated', c.bgSecondary);
  el.style.setProperty('--idc-surface-overlay', `${c.bgPrimary}cc`);

  // Borders
  el.style.setProperty('--idc-border-subtle', c.border);
  el.style.setProperty('--idc-border-default', c.border);
  el.style.setProperty('--idc-border-strong', c.border);
  el.style.setProperty('--idc-border-focus', c.accent);

  // Electric Violet accent system
  el.style.setProperty('--idc-accent-primary', c.accent);
  el.style.setProperty('--idc-accent-hover', c.accentHover);
  el.style.setProperty('--idc-accent-muted', c.accentMuted);
  el.style.setProperty('--idc-accent-subtle', c.accentSubtle);
  el.style.setProperty('--idc-accent-emphasis', c.accentEmphasis);

  // Status colors
  el.style.setProperty('--idc-success', c.success);
  el.style.setProperty('--idc-success-muted', c.successMuted);
  el.style.setProperty('--idc-warning', c.warning);
  el.style.setProperty('--idc-warning-muted', c.warningMuted);
  el.style.setProperty('--idc-error', c.error);
  el.style.setProperty('--idc-error-muted', c.errorMuted);
  el.style.setProperty('--idc-info', c.info);
  el.style.setProperty('--idc-info-muted', c.infoMuted);

  // Glow effects
  el.style.setProperty('--idc-glow', `${c.accent}26`);
  el.style.setProperty('--idc-glow-strong', `${c.accent}40`);

  // Selection
  el.style.setProperty('--idc-selection', `${c.accent}2e`);

  // Set data-theme attribute for CSS selectors
  const isDark = isColorDark(c.bgPrimary);
  el.setAttribute('data-theme', isDark ? 'dark' : 'light');
}
