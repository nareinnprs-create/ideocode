import { useState } from "react";
import { useChatStore } from "../../stores/chatStore";
import { DollarSign, Zap, BarChart3, X } from "lucide-react";

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  "auto": { input: 0, output: 0 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-sonnet-4": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku": { input: 0.00025, output: 0.00125 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.01 },
  "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_PER_1K[model] ?? { input: 0.002, output: 0.008 };
  return (promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output;
}

export function UsageOverlay() {
  const [open, setOpen] = useState(false);
  const messages = useChatStore((s) => s.messages);
  const model = useChatStore((s) => s.model);

  const totalPrompt = messages.reduce((a, m) => a + (m.usage?.prompt_tokens ?? 0), 0);
  const totalCompletion = messages.reduce((a, m) => a + (m.usage?.completion_tokens ?? 0), 0);
  const totalTokens = totalPrompt + totalCompletion;
  const totalCost = messages.reduce(
    (a, m) =>
      a +
      estimateCost(
        model,
        m.usage?.prompt_tokens ?? 0,
        m.usage?.completion_tokens ?? 0,
      ),
    0,
  );
  const messageCount = messages.filter((m) => m.role === "user").length;

  if (totalTokens === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-fg-secondary hover:text-fg-primary hover:bg-surface-hover border border-transparent hover:border-border-subtle transition-fast"
        aria-label="Usage details"
      >
        <DollarSign size={10} />
        <span className="font-mono">${totalCost.toFixed(4)}</span>
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-50 w-[280px] rounded-xl border border-border-default bg-surface shadow-xl animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <BarChart3 size={13} className="text-accent" />
              <span className="text-[12px] font-semibold text-fg-primary">Usage</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 rounded text-fg-muted hover:text-fg-primary transition-fast"
            >
              <X size={12} />
            </button>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-fg-muted">Tokens</div>
                <div className="text-[14px] font-semibold text-fg-primary font-mono">{totalTokens.toLocaleString()}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-fg-muted">Cost</div>
                <div className="text-[14px] font-semibold text-accent font-mono">${totalCost.toFixed(4)}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-fg-muted">Input</div>
                <div className="text-[12px] font-mono text-fg-secondary">{totalPrompt.toLocaleString()}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-fg-muted">Output</div>
                <div className="text-[12px] font-mono text-fg-secondary">{totalCompletion.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                <Zap size={10} className="text-accent" />
                <span>{messageCount} messages</span>
              </div>
              <div className="text-[10px] text-fg-muted font-mono">{model}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
