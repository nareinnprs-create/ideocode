export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface RadioGroupProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: RadioOption<T>[];
  name: string;
  className?: string;
  disabled?: boolean;
}

export function RadioGroup<T extends string>({
  value,
  onValueChange,
  options,
  name,
  className = "",
  disabled = false,
}: RadioGroupProps<T>) {
  return (
    <div role="radiogroup" className={`flex flex-col gap-1.5 ${className}`}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 ${
              disabled ? "opacity-50 cursor-not-allowed" : selected ? "bg-surface-hover" : "cursor-pointer hover:bg-surface-hover/60"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onValueChange(opt.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={[
                "inline-flex items-center justify-center w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 transition-all duration-150",
                selected ? "border-accent" : "border-border-default",
              ].join(" ")}
            >
              {selected && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className={`text-sm leading-tight ${selected ? "text-fg-primary font-medium" : "text-fg-secondary"}`}>
                {opt.label}
              </span>
              {opt.description && <span className="text-[11px] text-fg-muted leading-snug">{opt.description}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
