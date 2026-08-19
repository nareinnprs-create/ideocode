import { useState } from "react";
import { Pencil, Undo2, Check, X } from "lucide-react";
import { useChatStore } from "../../stores/chatStore";

interface EditHistoryButtonProps {
  messageId: string;
  role: "user" | "assistant";
  onEdit?: (content: string) => void;
  onUndo?: () => void;
}

export function EditHistoryButton({ messageId, role, onEdit, onUndo }: EditHistoryButtonProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const messages = useChatStore((s) => s.messages);
  const editLast = useChatStore((s) => s.editLast);

  const message = messages.find((m) => m.id === messageId);

  const handleStartEdit = () => {
    if (!message) return;
    setDraft(message.content);
    setEditing(true);
  };

  const handleCommitEdit = () => {
    const content = draft.trim();
    setEditing(false);
    if (content && content !== message?.content) {
      if (onEdit) {
        onEdit(content);
      } else {
        void editLast(content);
      }
    }
  };

  const handleCancel = () => {
    setDraft("");
    setEditing(false);
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
    }
  };

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1 ml-1">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCommitEdit();
            }
            if (e.key === "Escape") handleCancel();
          }}
          className="px-2 py-1 text-xs rounded border border-accent-primary/40 bg-accent-primary/8 text-text-primary outline-none resize-none min-h-[28px] max-h-20 w-48"
        />
        <button onClick={handleCommitEdit} className="msg-action text-success">
          <Check size={12} />
        </button>
        <button onClick={handleCancel} className="msg-action text-error">
          <X size={12} />
        </button>
      </div>
    );
  }

  if (role === "user") {
    return (
      <button onClick={handleStartEdit} title="Edit message" className="msg-action">
        <Pencil size={12} />
      </button>
    );
  }

  if (role === "assistant" && message?.tool_calls && message.tool_calls.length > 0) {
    return (
      <button onClick={handleUndo} title="Undo file changes" className="msg-action">
        <Undo2 size={12} />
      </button>
    );
  }

  return null;
}
