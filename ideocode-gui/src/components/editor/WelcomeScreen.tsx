import { useAppStore } from "../../stores/appStore";
import { Sparkles, TerminalSquare, FileCode2, Command } from "lucide-react";

const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");
const mod = isMac ? "⌘" : "Ctrl";

export function WelcomeScreen() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-bg-primary select-none p-8 h-full">
      <div className="flex flex-col items-center max-w-lg w-full">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--idc-accent-primary)] to-[var(--idc-info)] flex items-center justify-center mb-8 shadow-lg opacity-90">
          <Sparkles className="text-white" size={32} />
        </div>
        
        <h1 className="text-2xl font-semibold text-text-primary mb-2">IDEOCODE</h1>
        <p className="text-text-muted text-center mb-12">
          The AI-native editor for the next generation of builders.
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover hover:border-[var(--idc-accent-primary)]/30 transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-2 text-text-primary group-hover:text-[var(--idc-accent-primary)] transition-colors">
              <Command size={16} />
              <span className="font-medium">Command Palette</span>
            </div>
            <span className="text-xs text-text-muted">Search files, commands, and settings</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              {mod}K
            </kbd>
          </button>
          
          <button className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover hover:border-[var(--idc-accent-primary)]/30 transition-all text-left group">
            <div className="flex items-center gap-2 mb-2 text-text-primary group-hover:text-[var(--idc-accent-primary)] transition-colors">
              <FileCode2 size={16} />
              <span className="font-medium">Open File</span>
            </div>
            <span className="text-xs text-text-muted">Browse your workspace</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              {mod}P
            </kbd>
          </button>

          <button className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover hover:border-[var(--idc-accent-primary)]/30 transition-all text-left group">
            <div className="flex items-center gap-2 mb-2 text-text-primary group-hover:text-[var(--idc-accent-primary)] transition-colors">
              <Sparkles size={16} />
              <span className="font-medium">Composer</span>
            </div>
            <span className="text-xs text-text-muted">Orchestrate multi-file changes</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              {mod}I
            </kbd>
          </button>

          <button className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover hover:border-[var(--idc-accent-primary)]/30 transition-all text-left group">
            <div className="flex items-center gap-2 mb-2 text-text-primary group-hover:text-[var(--idc-accent-primary)] transition-colors">
              <TerminalSquare size={16} />
              <span className="font-medium">Terminal</span>
            </div>
            <span className="text-xs text-text-muted">Run integrated terminal</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              {mod}J
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
