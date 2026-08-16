import { useState, useEffect, useRef } from "react";
import { Sparkles, CornerDownLeft, Loader2 } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";

interface CmdKOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number } | null;
  onSubmit: (prompt: string) => void;
}

export function CmdKOverlay({ isOpen, onClose, position, onSubmit }: CmdKOverlayProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = useChatStore((s) => s.loading);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setPrompt("");
    }
  }, [isOpen]);

  if (!isOpen || !position) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    onSubmit(prompt);
  };

  return (
    <div
      className="absolute z-50 animate-scale-in"
      style={{
        top: position.top,
        left: position.left,
        transform: "translate(-50%, -100%)",
        marginTop: "-10px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-1.5 rounded-lg border border-border-strong bg-bg-secondary shadow-modal w-[450px]"
      >
        <Sparkles size={16} className="text-accent-primary ml-1" />
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Generate or edit code..."
          className="flex-1 bg-transparent border-none outline-none text-sm font-sans text-text-primary placeholder:text-text-muted"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="w-6 h-6 rounded-md bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <CornerDownLeft size={12} />}
        </button>
      </form>
    </div>
  );
}
