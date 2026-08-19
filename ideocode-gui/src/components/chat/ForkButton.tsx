import { GitBranch } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";
import { Tooltip } from "../ui/Tooltip";
import type { Message } from "../../lib/tauri-commands";

interface ForkButtonProps {
  messageId: string;
  messageIndex: number;
  messages: Message[];
}

export function ForkButton({ messageIndex, messages }: ForkButtonProps) {
  const createBranch = useChatStore((s) => s.createBranch);
  const switchBranch = useChatStore((s) => s.switchBranch);

  const message = messages[messageIndex];
  if (!message || message.role !== "assistant") return null;

  const handleFork = () => {
    createBranch();
    const branches = useChatStore.getState().branches;
    const latest = branches[branches.length - 1];
    if (latest) {
      switchBranch(latest.id);
    }
  };

  return (
    <Tooltip label="Fork conversation from here">
      <button
        onClick={handleFork}
        className="msg-action"
        title="Fork conversation from here"
      >
        <GitBranch size={12} />
      </button>
    </Tooltip>
  );
}
