import { useState, useEffect } from "react";
import { Shield, Check, X, Terminal, FileEdit, FilePlus, Search } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useChatStore } from "../../stores/chatStore";
import { notify } from "../../stores/toastStore";
import { approveTools, denyTools } from "../../lib/tauri-commands";

interface PendingTool {
  assistantId: string;
  tools: string[];
}

const TOOL_ICONS: Record<string, typeof Terminal> = {
  bash: Terminal,
  read_file: Search,
  write_file: FilePlus,
  edit_file: FileEdit,
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  bash: "Execute shell command",
  read_file: "Read file contents",
  write_file: "Write file to disk",
  edit_file: "Edit existing file",
};

export function PermissionPrompt() {
  const executionMode = useChatStore((s) => s.executionMode);
  const [pending, setPending] = useState<PendingTool | null>(null);

  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    listen<PendingTool>("chat://tool", (e) => {
      if (executionMode === "confirm") {
        setPending(e.payload);
      }
    }).then((u) => unlisteners.push(u));

    listen("chat://done", () => {
      setPending(null);
    }).then((u) => unlisteners.push(u));

    listen("chat://error", () => {
      setPending(null);
    }).then((u) => unlisteners.push(u));

    return () => {
      for (const u of unlisteners) u();
    };
  }, [executionMode]);

  if (!pending || executionMode !== "confirm") return null;

  const handleApprove = async () => {
    setPending(null);
    try {
      await approveTools();
      notify("success", "Tools approved", `${pending.tools.length} tool(s) approved`);
    } catch (e) {
      notify("warning", "Could not approve", `${e}`);
    }
  };

  const handleDeny = async () => {
    setPending(null);
    try {
      await denyTools();
      notify("info", "Tools denied", "Tool execution was denied");
    } catch (e) {
      notify("warning", "Could not deny", `${e}`);
    }
  };

  return (
    <div className="mx-4 mb-3 rounded-xl border border-warning/30 bg-warning-muted/30 p-3 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <Shield size={14} className="text-warning" />
        <span className="text-[12px] font-medium text-fg-primary">Permission Required</span>
      </div>
      <div className="space-y-1.5 mb-3">
        {pending.tools.map((tool, i) => {
          const Icon = TOOL_ICONS[tool] ?? Terminal;
          return (
            <div key={i} className="flex items-center gap-2 text-[11px] text-fg-secondary">
              <Icon size={12} className="text-fg-muted shrink-0" />
              <span className="font-medium">{tool}</span>
              <span className="text-fg-muted">— {TOOL_DESCRIPTIONS[tool] ?? "Tool call"}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleDeny}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
            bg-surface-elevated text-fg-primary hover:bg-surface-hover border border-border-subtle transition-fast"
        >
          <X size={12} />
          Deny
        </button>
        <button
          onClick={handleApprove}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
            bg-accent text-white hover:bg-accent-hover transition-fast"
        >
          <Check size={12} />
          Approve
        </button>
      </div>
    </div>
  );
}
