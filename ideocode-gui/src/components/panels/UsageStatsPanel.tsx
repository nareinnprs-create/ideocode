import { useState, useMemo } from "react";
import {
  BarChart3,
  MessageSquare,
  Bot,
  User,
  Calendar,
  Flame,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useChatStore } from "../../stores/chatStore";
import type { Message } from "../../lib/tauri-commands";

type DateRange = "all" | "30d" | "7d";

const DATE_RANGE_OPTIONS: { id: DateRange; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "30d", label: "Last 30 Days" },
  { id: "7d", label: "Last 7 Days" },
];

function filterByDateRange(messages: Message[], range: DateRange) {
  if (range === "all") return messages;
  const now = Date.now();
  const days = range === "30d" ? 30 : 7;
  const cutoff = now - days * 86_400_000;
  return messages.filter((m) => (m.timestamp ?? 0) >= cutoff);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function UsageStatsPanel() {
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen);
  const messages = useChatStore((s) => s.messages);
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const filtered = useMemo(() => filterByDateRange(messages, dateRange), [messages, dateRange]);

  const totalTokens = filtered.reduce((sum, m) => sum + (m.usage?.total_tokens ?? 0), 0);
  const inputTokens = filtered.reduce((sum, m) => sum + (m.usage?.prompt_tokens ?? 0), 0);
  const outputTokens = filtered.reduce((sum, m) => sum + (m.usage?.completion_tokens ?? 0), 0);
  const messageCount = filtered.length;
  const assistantMessages = filtered.filter((m) => m.role === "assistant").length;
  const userMessages = filtered.filter((m) => m.role === "user").length;

  const estimatedCost =
    (outputTokens / 1000) * 0.002 + (inputTokens / 1000) * 0.001;

  const dailyData = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const m of filtered) {
      if (!m.timestamp || !m.usage) continue;
      const d = new Date(m.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      byDay[d] = (byDay[d] ?? 0) + m.usage.total_tokens;
    }
    const entries = Object.entries(byDay).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
    );
    return entries.slice(-14);
  }, [filtered]);

  const maxDaily = dailyData.length > 0 ? Math.max(...dailyData.map(([, v]) => v)) : 1;

  const activeDays = useMemo(() => {
    const days = new Set<string>();
    for (const m of filtered) {
      if (!m.timestamp) continue;
      days.add(new Date(m.timestamp).toDateString());
    }
    return days.size;
  }, [filtered]);

  const modelUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of filtered) {
      if (m.role !== "assistant") continue;
      const model = (m as Message & { model?: string }).model;
      if (model) {
        counts[model] = (counts[model] ?? 0) + (m.usage?.total_tokens ?? 0);
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filtered]);

  const sessionCount = useMemo(() => {
    const sessions = new Set<string>();
    for (const m of filtered) {
      if (!m.timestamp) continue;
      sessions.add(new Date(m.timestamp).toDateString());
    }
    return sessions.size || 1;
  }, [filtered]);

  const avgTokensPerSession = Math.round(totalTokens / sessionCount);

  const streak = useMemo(() => {
    const days = new Set<string>();
    for (const m of filtered) {
      if (!m.timestamp) continue;
      days.add(new Date(m.timestamp).toDateString());
    }
    const sorted = Array.from(days)
      .map((d) => new Date(d).getTime())
      .sort((a, b) => b - a);
    let count = 0;
    const now = Date.now();
    for (let i = 0; i < sorted.length; i++) {
      const diff = now - sorted[i];
      if (diff <= (count + 1) * 86_400_000 + 86_400_000) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1 flex items-center justify-between">
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-fast rounded hover:bg-bg-elevated"
        >
          <BarChart3 size={14} /> Usage Stats
        </button>
      </div>

      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-1" role="tablist" aria-label="Date range">
          {DATE_RANGE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setDateRange(id)}
              aria-pressed={dateRange === id}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-fast ${
                dateRange === id
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
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
                <div className="text-lg font-semibold text-text-primary mt-0.5">{formatTokens(totalTokens)}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Cost</div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">${estimatedCost.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                <div className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={9} /> Messages
                </div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">{messageCount}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
                <div className="text-[10px] text-text-muted uppercase tracking-wider">Input / Output</div>
                <div className="text-lg font-semibold text-text-primary mt-0.5">
                  <span className="text-[10px] text-text-muted mr-1">
                    <User size={9} className="inline" />{userMessages}
                  </span>
                  /
                  <span className="text-[10px] text-text-muted ml-1">
                    <Bot size={9} className="inline" />{assistantMessages}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-bg-tertiary border border-border-subtle text-center">
                <Calendar size={12} className="mx-auto text-text-muted mb-0.5" />
                <div className="text-sm font-semibold text-text-primary">{activeDays}</div>
                <div className="text-[9px] text-text-muted">Active Days</div>
              </div>
              <div className="p-2 rounded-lg bg-bg-tertiary border border-border-subtle text-center">
                <MessageSquare size={12} className="mx-auto text-text-muted mb-0.5" />
                <div className="text-sm font-semibold text-text-primary">{sessionCount}</div>
                <div className="text-[9px] text-text-muted">Sessions</div>
              </div>
              <div className="p-2 rounded-lg bg-bg-tertiary border border-border-subtle text-center">
                <Flame size={12} className="mx-auto text-text-muted mb-0.5" />
                <div className="text-sm font-semibold text-text-primary">{streak}</div>
                <div className="text-[9px] text-text-muted">Streak</div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-bg-tertiary border border-border-subtle">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                Avg Tokens / Session
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {formatTokens(avgTokensPerSession)}
              </div>
            </div>

            {dailyData.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-text-secondary mb-2">Daily Token Trend</div>
                <div className="flex items-end gap-1 h-16">
                  {dailyData.map(([day, tokens]) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <div
                        className="w-full rounded-t bg-accent-primary/60 transition-all"
                        style={{ height: `${Math.max(4, (tokens / maxDaily) * 48)}px` }}
                        title={`${day}: ${formatTokens(tokens)}`}
                      />
                      <span className="text-[7px] text-text-muted truncate w-full text-center">{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {modelUsage.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-text-secondary mb-2">Model Usage Ranking</div>
                <div className="space-y-1.5">
                  {modelUsage.map(([model, tokens], i) => (
                    <div key={model} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted font-mono w-4">{i + 1}.</span>
                        <span className="text-[11px] text-text-primary flex-1 truncate">{model}</span>
                        <span className="text-[10px] text-text-muted font-mono">{formatTokens(tokens)}</span>
                      </div>
                      <div className="w-full h-1 rounded bg-bg-elevated overflow-hidden">
                        <div
                          className="h-full rounded bg-accent-primary/50"
                          style={{ width: `${(tokens / totalTokens) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-medium text-text-secondary mb-2">Token Breakdown</div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-text-muted">
                  <span>Prompt tokens</span>
                  <span className="font-mono">{formatTokens(inputTokens)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Completion tokens</span>
                  <span className="font-mono">{formatTokens(outputTokens)}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-text-secondary mb-2">Cost Breakdown</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-primary flex-1">Input cost (prompt)</span>
                  <span className="text-[10px] text-text-muted font-mono">
                    ${((inputTokens / 1000) * 0.001).toFixed(4)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded bg-info/60"
                    style={{ width: `${totalTokens > 0 ? (inputTokens / totalTokens) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-primary flex-1">Output cost (completion)</span>
                  <span className="text-[10px] text-text-muted font-mono">
                    ${((outputTokens / 1000) * 0.002).toFixed(4)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded bg-accent-primary/60"
                    style={{ width: `${totalTokens > 0 ? (outputTokens / totalTokens) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
