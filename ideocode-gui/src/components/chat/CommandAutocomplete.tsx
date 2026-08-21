import { useEffect, useRef, useState } from "react";
import { Target, Scissors, Plus, Command } from "lucide-react";
import { useCommandStore } from "../../stores/commandStore";

interface CommandAutocompleteProps {
  input: string;
  onSelect: (command: string, args: string) => void;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Target;
}

const BUILT_IN_COMMANDS: CommandItem[] = [
  { id: "goal", label: "goal", description: "Set or manage a goal", icon: Target },
  { id: "compact", label: "compact", description: "Compact conversation", icon: Scissors },
  { id: "clear", label: "clear", description: "Start a new conversation", icon: Plus },
];

export function CommandAutocomplete({ input, onSelect, onClose }: CommandAutocompleteProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const userCommands = useCommandStore((s) => s.commands);

  const query = input.startsWith("/") ? input.slice(1).trim().toLowerCase() : "";

  const allCommands: CommandItem[] = [
    ...BUILT_IN_COMMANDS,
    ...userCommands.map((c) => ({
      id: c.name,
      label: c.name,
      description: c.description,
      icon: Command,
    })),
  ];

  const commands = allCommands.filter(
    (cmd) => cmd.id.startsWith(query) || cmd.label.includes(query),
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (commands.length === 0) {
      onClose();
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % commands.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + commands.length) % commands.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = commands[activeIdx];
        if (cmd) {
          const args = input.slice(input.indexOf(" ") + 1).trim();
          onSelect(cmd.id, args);
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commands, activeIdx, input, onSelect, onClose]);

  useEffect(() => {
    itemRefs.current[activeIdx]?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (commands.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-4 right-4 mb-2 z-30 rounded-lg border border-border-default surface-blur bg-surface-elevated overflow-hidden animate-scale-in max-h-48 overflow-y-auto"
    >
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-fg-muted border-b border-border-subtle flex items-center gap-1.5">
        <Command size={10} />
        Commands
      </div>
      {commands.map((cmd, i) => (
        <button
          key={cmd.id}
          ref={(el) => { itemRefs.current[i] = el; }}
          onClick={() => {
            const args = input.slice(input.indexOf(" ") + 1).trim();
            onSelect(cmd.id, args);
          }}
          onMouseEnter={() => setActiveIdx(i)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-fast ${
            i === activeIdx ? "bg-accent/10" : ""
          }`}
        >
          <cmd.icon size={14} className="text-accent shrink-0" />
          <span className="text-[13px] text-fg-primary font-medium">/{cmd.label}</span>
          <span className="text-xs text-fg-muted flex-1 text-right truncate">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
