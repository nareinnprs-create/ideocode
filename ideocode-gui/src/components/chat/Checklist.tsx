import { useMemo, useState } from "react";
import { ListChecks, CheckCircle2 } from "lucide-react";
import { Checkbox } from "../ui/Checkbox";
import { Progress } from "../ui/Progress";

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export function parseChecklist(content: string): ChecklistItem[] | null {
  const items: ChecklistItem[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*[-*]\s*\[( |x|X)\]\s*(.+)$/);
    if (match) {
      items.push({ text: match[2].trim(), checked: match[1] !== " " });
    }
  }
  return items.length > 0 ? items : null;
}

interface ChecklistProps {
  content: string;
}

export function Checklist({ content }: ChecklistProps) {
  const initial = useMemo(() => parseChecklist(content), [content]);
  const [items, setItems] = useState<ChecklistItem[] | null>(initial);

  if (!items || items.length === 0) return null;

  const done = items.filter((i) => i.checked).length;
  const allDone = done === items.length;

  const toggle = (index: number) => {
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === index ? { ...it, checked: !it.checked } : it)) : prev
    );
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-surface overflow-hidden my-1.5">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          {allDone ? (
            <CheckCircle2 size={13} className="text-success" />
          ) : (
            <ListChecks size={13} className="text-accent" />
          )}
          <span className="text-xs font-medium text-fg-primary">Checklist</span>
        </div>
        <span className="text-[11px] font-mono text-fg-muted">
          {done}/{items.length}
        </span>
      </div>
      <div className="px-3 pt-2">
        <Progress value={done} max={items.length} tone={allDone ? "success" : "accent"} />
      </div>
      <div className="px-3 py-2 flex flex-col gap-1">
        {items.map((item, i) => (
          <Checkbox
            key={i}
            checked={item.checked}
            onCheckedChange={() => toggle(i)}
            label={
              <span className={item.checked ? "line-through text-fg-muted" : ""}>{item.text}</span>
            }
          />
        ))}
      </div>
    </div>
  );
}
