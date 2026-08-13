import { forwardRef, type ComponentProps } from "react";

interface TextareaProps extends ComponentProps<"textarea"> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className = "", id, ...rest },
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
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={[
          "w-full min-h-20 rounded-lg border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-y",
          "transition-all duration-150 outline-none",
          error
            ? "border-error/60 focus:border-error focus:ring-2 focus:ring-error/20"
            : "border-border-subtle focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 hover:border-border-default",
          className,
        ].join(" ")}
        {...rest}
      />
      {error ? (
        <span className="text-[11px] text-error">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
});
