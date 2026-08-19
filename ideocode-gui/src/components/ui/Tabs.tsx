import { createContext, useContext, useState, type ReactNode } from "react";

interface TabsCtx {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsCtx>({ value: "", onValueChange: () => {} });

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  children,
  className = "",
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (v: string) => {
    if (!isControlled) setUncontrolledValue(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className = "" }: TabsListProps) {
  return (
    <div role="tablist" className={`flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-tertiary ${className}`}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TabsTrigger({ value, children, disabled = false, className = "" }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  const isActive = ctx.value === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => ctx.onValueChange(value)}
      className={[
        "flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150",
        isActive ? "bg-bg-elevated text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = "" }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={`mt-2 animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
