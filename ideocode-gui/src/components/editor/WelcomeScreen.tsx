import { useAppStore } from "../../stores/appStore";
import { useFileStore } from "../../stores/fileStore";
import { Sparkles, TerminalSquare, FileCode2, Command, FolderOpen, MessageCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem, transitions } from "../../lib/motion";

const isMac = typeof navigator !== "undefined" && navigator.platform.startsWith("Mac");
const mod = isMac ? "⌘" : "Ctrl";

export function WelcomeScreen() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setComposerOpen = useAppStore((s) => s.setComposerOpen);
  const setRightPanel = useAppStore((s) => s.setRightPanel);
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const rootPath = useFileStore((s) => s.rootPath);

  const handleOpenFile = () => {
    setCommandPaletteOpen(true);
  };

  const handleComposer = () => {
    setComposerOpen(true);
  };

  const handleTerminal = () => {
    if (!rightPanelOpen) setRightPanelOpen(true);
    setRightPanel("commands");
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-surface select-none p-8 h-full relative overflow-hidden">
      {/* Aurora ambient background */}
      <div className="aurora" />

      <div className="flex flex-col items-center max-w-lg w-full relative z-10">
        {/* Logo with glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--idc-accent)] to-[var(--idc-info)] blur-xl opacity-40 animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--idc-accent)] to-[var(--idc-info)] flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={32} />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-fg-primary mb-2 text-gradient-brand">IDEOCODE</h1>
        <p className="text-fg-muted text-center mb-4">
          The AI-native editor for the next generation of builders.
        </p>

        {/* Quick actions hint */}
        <div className="flex items-center gap-3 mb-10 text-[11px] text-fg-muted">
          <span className="flex items-center gap-1">
            <Zap size={10} className="text-accent" />
            Multi-model AI
          </span>
          <span className="text-border-default">·</span>
          <span className="flex items-center gap-1">
            <Sparkles size={10} className="text-accent-secondary" />
            30+ tools
          </span>
          <span className="text-border-default">·</span>
          <span className="flex items-center gap-1">
            <MessageCircle size={10} className="text-accent-tertiary" />
            Swarm coordination
          </span>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4 w-full"
        >
          <motion.div variants={staggerItem} transition={transitions.gentle}>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex flex-col items-start p-4 rounded-xl border border-border-subtle surface-blur bg-surface/70 hover:bg-surface-hover hover:border-[var(--idc-accent)]/30 transition-all text-left group card-hover-lift"
            >
              <div className="flex items-center gap-2 mb-2 text-fg-primary group-hover:text-[var(--idc-accent)] transition-colors">
                <Command size={16} />
                <span className="font-medium">Command Palette</span>
              </div>
              <span className="text-xs text-fg-muted">Search files, commands, and settings</span>
              <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-elevated text-[10px] font-mono text-fg-muted border border-border-subtle">
                {mod}K
              </kbd>
            </button>
          </motion.div>

          <motion.div variants={staggerItem} transition={transitions.gentle}>
            <button
              onClick={handleOpenFile}
              className="flex flex-col items-start p-4 rounded-xl border border-border-subtle surface-blur bg-surface/70 hover:bg-surface-hover hover:border-[var(--idc-accent)]/30 transition-all text-left group card-hover-lift"
            >
              <div className="flex items-center gap-2 mb-2 text-fg-primary group-hover:text-[var(--idc-accent)] transition-colors">
                <FileCode2 size={16} />
                <span className="font-medium">Open File</span>
              </div>
              <span className="text-xs text-fg-muted">Browse your workspace</span>
              <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-elevated text-[10px] font-mono text-fg-muted border border-border-subtle">
                {mod}P
              </kbd>
            </button>
          </motion.div>

          <motion.div variants={staggerItem} transition={transitions.gentle}>
            <button
              onClick={handleComposer}
              className="flex flex-col items-start p-4 rounded-xl border border-border-subtle surface-blur bg-surface/70 hover:bg-surface-hover hover:border-[var(--idc-accent)]/30 transition-all text-left group card-hover-lift"
            >
              <div className="flex items-center gap-2 mb-2 text-fg-primary group-hover:text-[var(--idc-accent)] transition-colors">
                <Sparkles size={16} />
                <span className="font-medium">Composer</span>
              </div>
              <span className="text-xs text-fg-muted">Orchestrate multi-file changes</span>
              <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-elevated text-[10px] font-mono text-fg-muted border border-border-subtle">
                {mod}I
              </kbd>
            </button>
          </motion.div>

          <motion.div variants={staggerItem} transition={transitions.gentle}>
            <button
              onClick={handleTerminal}
              className="flex flex-col items-start p-4 rounded-xl border border-border-subtle surface-blur bg-surface/70 hover:bg-surface-hover hover:border-[var(--idc-accent)]/30 transition-all text-left group card-hover-lift"
            >
              <div className="flex items-center gap-2 mb-2 text-fg-primary group-hover:text-[var(--idc-accent)] transition-colors">
                <TerminalSquare size={16} />
                <span className="font-medium">Terminal</span>
              </div>
              <span className="text-xs text-fg-muted">Run integrated terminal</span>
              <kbd className="mt-4 inline-flex items-center px-1.5 py-0.5 rounded-md bg-surface-elevated text-[10px] font-mono text-fg-muted border border-border-subtle">
                {mod}J
              </kbd>
            </button>
          </motion.div>
        </motion.div>

        {/* Workspace info */}
        {rootPath && (
          <div className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated/50 border border-border-subtle text-[11px] text-fg-muted">
            <FolderOpen size={12} />
            <span className="truncate max-w-64">{rootPath}</span>
          </div>
        )}

        {/* Keyboard shortcuts cheat sheet */}
        <div className="mt-8 flex items-center gap-4 text-[10px] text-fg-muted">
          <span>{mod}+N New Task</span>
          <span>{mod}+K Search</span>
          <span>{mod}+P Files</span>
          <span>{mod}+I Composer</span>
          <span>{mod}+J Terminal</span>
        </div>
      </div>
    </div>
  );
}
