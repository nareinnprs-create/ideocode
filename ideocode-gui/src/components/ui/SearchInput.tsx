import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  defaultValue = "",
  onChange,
  onSearch,
  onClear,
  placeholder = "Search...",
  debounceMs = 200,
  autoFocus = false,
  className = "",
}: SearchInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleChange = (val: string) => {
    if (!isControlled) setUncontrolledValue(val);
    onChange?.(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch?.(val), debounceMs);
  };

  const handleClear = () => {
    if (!isControlled) setUncontrolledValue("");
    onChange?.("");
    onClear?.();
    onSearch?.("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      clearTimeout(timerRef.current);
      onSearch?.(currentValue);
    }
    if (e.key === "Escape") {
      handleClear();
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search size={14} className="absolute left-2.5 text-text-muted pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-border-subtle bg-bg-tertiary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-colors"
      />
      {currentValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
