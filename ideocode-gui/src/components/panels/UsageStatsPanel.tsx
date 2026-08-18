import { BarChart3, MessageSquare, Bot, User } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useChatStore } from "../../stores/chatStore";

export function UsageStatsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const messages = useChatStore((s) => s.messages);

  const totalTokens = messages.reduce((sum, m) => sum + (m.usage?.total_tokens ?? 0), 0);
  const inputTokens = messages.reduce((sum, m) => sum + (m.usage?.prompt_tokens ?? 0), 0);
  const outputTokens = messages.reduce((sum, m) => sum + (m.usage?.completion_tokens ?? 0), 0);
  const messageCount = messages.length;
  const assistantMessages = messages.filter((m) => m.role === "assistant").length;
  const userMessages = messages.filter((m) => m.role === "user").length;

  const estimatedCost =
    (outputTokens / 1000) * 0.002 + (inputTokens / 1000) * 0.001;

  const modelMap = new Map<string, { tokens: number; count: number; cost: number }>();
  for (const m of messages) {
    if (!m.usage) continue;
    const model = (m as Record<string, unknown>).model as string | undefined ?? "unknown";
    const existing = modelMap.get(model) ?? { tokens: 0, count: 0, cost: 0 };
    existing.tokens += m.usage.total_tokens;
    existing.count += 1;
    existing.cost += (m.usage.completion_tokens / 1000) * 0.002 + (m.usage.prompt_tokens / 1000) * 0.001;
    modelMap.set(model, existing);
  }
  const modelBreakdown = Array.from(modelMap.entries())
    .map(([model, data]) => ({ model, ...data }))
    .sort((a, b) => b.tokens - a.tokens);

  const maxModelTokens = Math.max(...modelBreakdown.map((m) => m.tokens), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button onClick={() => setRightPanelOpen(false)} className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated">
          <BarChart3 size={14} /> Usage Stats
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-xs space-y-2">
            <BarChart3 size={24} className="opacity-40" />
            <span>No messages yet</span>
            <span className="text-[10px] opacity-60">Usage stats will appear here</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Tokens</div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">{(totalTokens / 1000).toFixed(1)}k</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Cost</div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">${estimatedCost.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                <div className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1"><MessageSquare size={9} /> Messages</div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">{messageCount}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Input / Output</div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">
                  <span className="text-[10px] text-text-muted mr-1"><User size={9} className="inline" />{userMessages}</span>
                  /
                  <span className="text-[10px] text-text-muted ml-1"><Bot size={9} className="inline" />{assistantMessages}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-text-secondary mb-2">Token Breakdown</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-text-muted">
                  <span>Prompt tokens</span>
                  <span className="font-mono">{(inputTokens / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Completion tokens</span>
                  <span className="font-mono">{(outputTokens / 1000).toFixed(1)}k</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-text-secondary mb-2">By Model</div>
              <div className="space-y-1.5">
                {modelBreakdown.map((m) => (
                  <div key={m.model} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-primary flex-1 truncate">{m.model}</span>
                      <span className="text-[10px] text-text-muted font-mono">{(m.tokens / 1000).toFixed(1)}k</span>
                      <span className="text-[10px] text-text-muted font-mono">${m.cost.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 rounded bg-bg-tertiary overflow-hidden">
                      <div
                        className="h-full rounded bg-accent-primary/60"
                        style={{ width: `${(m.tokens / maxModelTokens) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
