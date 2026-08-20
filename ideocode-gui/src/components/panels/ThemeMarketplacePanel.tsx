import { useState, useRef } from 'react';
import { useThemeStore, type ThemeColors } from '../../stores/themeStore';
import { useAchievementStore } from '../../stores/achievementStore';

const EMPTY_COLORS: ThemeColors = {
  bgPrimary: '#1a1a2e', bgSecondary: '#16213e', bgTertiary: '#0f3460',
  textPrimary: '#e6e6e6', textSecondary: '#b0b0c0', textMuted: '#707088',
  border: '#2a2a4a', accent: '#7C3AED', accentHover: '#6D28D9',
  success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6',
};

export function ThemeMarketplacePanel() {
  const { themes, activeThemeId, setTheme, createTheme, deleteTheme, exportTheme, importTheme } = useThemeStore();
  const achievementStore = useAchievementStore();
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [desc, setDesc] = useState('');
  const [colors, setColors] = useState<ThemeColors>({ ...EMPTY_COLORS });
  const [importText, setImportText] = useState('');
  const [tab, setTab] = useState<'browse' | 'create' | 'import'>('browse');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = createTheme({ name: name.trim(), author: author.trim() || 'Custom', description: desc.trim(), colors, isBuiltin: false });
    setTheme(id);
    achievementStore.unlock('theme-change');
    setName(''); setAuthor(''); setDesc(''); setColors({ ...EMPTY_COLORS });
    setTab('browse');
  };

  const handleImport = () => {
    if (importTheme(importText)) {
      setImportText('');
      setTab('browse');
    }
  };

  const handleExportFile = (id: string) => {
    const json = exportTheme(id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `theme-${id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const allThemes = themes;

  return (
    <div className="flex flex-col h-full text-text-primary" role="region" aria-label="Theme marketplace">
      <div className="flex border-b border-border-default">
        {(['browse', 'create', 'import'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} aria-selected={tab === t} className={`flex-1 py-2 text-xs font-medium capitalize transition-fast ${tab === t ? 'border-b-2 border-accent-primary text-accent-primary' : 'text-text-muted hover:text-text-secondary'}`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'browse' && (
          <div className="space-y-2">
            {allThemes.map(theme => (
              <div key={theme.id} className={`p-3 rounded-lg border ${activeThemeId === theme.id ? 'border-accent-primary bg-accent-primary/5' : 'border-border-subtle'} cursor-pointer hover:border-accent-primary/50 transition-fast`} onClick={() => { setTheme(theme.id); achievementStore.unlock('theme-change'); }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">{theme.name}</div>
                    <div className="text-[10px] text-text-muted">{theme.author} · {theme.description}</div>
                  </div>
                  {activeThemeId === theme.id && <span className="text-[10px] text-accent-primary font-medium">Active</span>}
                </div>
                <div className="flex gap-1 h-4 rounded overflow-hidden">
                  {[theme.colors.bgPrimary, theme.colors.bgSecondary, theme.colors.accent, theme.colors.success, theme.colors.error, theme.colors.warning].map((c, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                {!theme.isBuiltin && (
                  <div className="flex gap-1 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); handleExportFile(theme.id); }} className="text-[10px] px-2 py-0.5 rounded border border-border-subtle text-text-muted hover:bg-bg-hover transition-fast">Export</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteTheme(theme.id); }} aria-label="Delete theme" className="text-[10px] px-2 py-0.5 rounded border border-error/30 text-error hover:bg-error/10 transition-fast">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'create' && (
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Theme name" aria-label="Theme name" className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border-subtle rounded text-text-primary placeholder:text-text-muted" />
            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author (optional)" aria-label="Author" className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border-subtle rounded text-text-primary placeholder:text-text-muted" />
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" aria-label="Theme description" className="w-full px-2 py-1.5 text-xs bg-bg-secondary border border-border-subtle rounded text-text-primary placeholder:text-text-muted" />
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(colors) as (keyof ThemeColors)[]).map(key => (
                <label key={key} className="flex items-center gap-2 text-xs text-text-secondary">
                  <input type="color" value={colors[key]} onChange={e => setColors({ ...colors, [key]: e.target.value })} aria-label={`${key} color`} className="w-6 h-6 rounded cursor-pointer border-0" />
                  <span className="truncate">{key}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-1 h-6 rounded overflow-hidden mt-2">
              {[colors.bgPrimary, colors.bgSecondary, colors.accent, colors.success, colors.error, colors.warning].map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={handleCreate} className="w-full py-2 text-xs bg-accent-primary text-white rounded font-medium transition-fast hover:bg-accent-hover">Create Theme</button>
          </div>
        )}

        {tab === 'import' && (
          <div className="space-y-3">
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste theme JSON here..." aria-label="Theme JSON" className="w-full h-40 px-2 py-1.5 text-xs bg-bg-secondary border border-border-subtle rounded resize-none font-mono text-text-primary placeholder:text-text-muted" />
            <button onClick={handleImport} className="w-full py-2 text-xs bg-accent-primary text-white rounded font-medium transition-fast hover:bg-accent-hover">Import Theme</button>
            <div className="text-center text-[10px] text-text-muted">or</div>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => { setImportText(reader.result as string); };
              reader.readAsText(file);
            }} />
            <button onClick={() => fileRef.current?.click()} className="w-full py-2 text-xs border border-border-subtle text-text-secondary rounded transition-fast hover:bg-bg-hover hover:border-border-default">Load from file</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThemeMarketplacePanel;
