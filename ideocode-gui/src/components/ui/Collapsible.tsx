import { createContext, useContext, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleCtx {
  open: boolean;
  onToggle: () => void;
}

const CollapsibleContext = createContext<CollapsibleCtx>({ open: false, onToggle: () => {} });

interface CollapsibleProps {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function Collapsible({
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const onToggle = () => {
    const next = !open;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <CollapsibleContext.Provider value={{ open, onToggle }}>
      <div className="w-full">{children}</div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function CollapsibleTrigger({ children, asChild }: CollapsibleTriggerProps) {
  const { open, onToggle } = useContext(CollapsibleContext);

  if (asChild) {
    return (
      <div onClick={onToggle} className="cursor-pointer">
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 w-full text-left text-xs font-medium text-fg-secondary hover:text-fg-primary transition-colors"
    >
      <ChevronRight
        size={14}
        className={`shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      />
      {children}
    </button>
  );
}

interface CollapsibleContentProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleContent({ children, className = "" }: CollapsibleContentProps) {
  const { open } = useContext(CollapsibleContext);

  if (!open) return null;

  return (
    <div className={`overflow-hidden animate-slide-up ${className}`}>
      {children}
    </div>
  );
}
