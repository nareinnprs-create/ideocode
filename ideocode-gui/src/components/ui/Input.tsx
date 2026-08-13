import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, trailingIcon, className = "", id, ...rest },
  ref
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      {label && (
        <label htmlFor={inputId} className="text-[11px] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-2.5 text-text-muted pointer-events-none flex items-center">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={[
            "w-full h-8 rounded-lg border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-muted",
            "transition-all duration-150 outline-none",
            leadingIcon ? "pl-8" : "",
            trailingIcon ? "pr-8" : "",
            error
              ? "border-error/60 focus:border-error focus:ring-2 focus:ring-error/20"
              : "border-border-subtle focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 hover:border-border-default",
            className,
          ].join(" ")}
          {...rest}
        />
        {trailingIcon && (
          <span className="absolute right-2.5 text-text-muted pointer-events-none flex items-center">
            {trailingIcon}
          </span>
        )}
      </div>
      {error ? (
        <span className="flex items-center gap-1 text-[11px] text-error">
          <AlertCircle size={11} /> {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
});
