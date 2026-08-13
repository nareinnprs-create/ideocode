import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectProps extends ComponentProps<"select"> {
  label?: string;
  hint?: string;
  options: SelectOption[];
  leadingIcon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, options, leadingIcon, className = "", id, ...rest },
  ref
) {
  const selectId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      {label && (
        <label htmlFor={selectId} className="text-[11px] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-2.5 text-text-muted pointer-events-none flex items-center">
            {leadingIcon}
          </span>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            "appearance-none w-full h-8 rounded-lg border border-border-subtle bg-bg-primary pr-8 text-sm text-text-primary",
            "transition-all duration-150 outline-none cursor-pointer",
            leadingIcon ? "pl-8" : "pl-3",
            "hover:border-border-default focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
            className,
          ].join(" ")}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-bg-secondary text-text-primary">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 text-text-muted pointer-events-none" />
      </div>
      {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
    </div>
  );
});
