import { useAppStore } from "../../stores/appStore";
import { Sparkles, TerminalSquare, FileCode2, Command } from "lucide-react";

export function WelcomeScreen() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-bg-primary select-none p-8 h-full">
      <div className="flex flex-col items-center max-w-lg w-full">
        <div className="w-16 h-16 rounded-2xl bg-bg-secondary border border-border-subtle flex items-center justify-center mb-8 shadow-panel">
          <Sparkles className="text-text-primary" size={32} />
        </div>
        
        <h1 className="text-2xl font-semibold text-text-primary mb-2">IDEOCODE</h1>
        <p className="text-text-muted text-center mb-12">
          The AI-native editor for the next generation of builders.
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover transition-colors text-left"
          >
            <div className="flex items-center gap-2 mb-2 text-text-primary">
              <Command size={16} />
              <span className="font-medium">Command Palette</span>
            </div>
            <span className="text-xs text-text-muted">Search files, commands, and settings</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              ⌘K
            </kbd>
          </button>
          
          <button className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover transition-colors text-left">
            <div className="flex items-center gap-2 mb-2 text-text-primary">
              <FileCode2 size={16} />
              <span className="font-medium">Open File</span>
            </div>
            <span className="text-xs text-text-muted">Browse your workspace</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              ⌘P
            </kbd>
          </button>

          <button className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover transition-colors text-left">
            <div className="flex items-center gap-2 mb-2 text-text-primary">
              <Sparkles size={16} />
              <span className="font-medium">Composer</span>
            </div>
            <span className="text-xs text-text-muted">Orchestrate multi-file changes</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              ⌘I
            </kbd>
          </button>

          <button className="flex flex-col items-start p-4 rounded-xl border border-border-subtle bg-bg-secondary hover:bg-bg-hover transition-colors text-left">
            <div className="flex items-center gap-2 mb-2 text-text-primary">
              <TerminalSquare size={16} />
              <span className="font-medium">Terminal</span>
            </div>
            <span className="text-xs text-text-muted">Run integrated terminal</span>
            <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-bg-tertiary text-[10px] font-mono text-text-muted border border-border-subtle">
              ⌘J
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
