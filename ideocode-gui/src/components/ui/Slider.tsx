import type { ComponentProps } from "react";

interface SliderProps extends ComponentProps<"input"> {
  label?: string;
  valueLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onValueChange?: (value: number) => void;
}

export function Slider({
  label,
  valueLabel,
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  className = "",
  ...rest
}: SliderProps) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {(label || valueLabel) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-[11px] font-medium text-text-secondary">{label}</span>}
          {valueLabel && <span className="text-[11px] font-mono text-text-muted">{valueLabel}</span>}
        </div>
      )}
      <input
        type="range"
        className={`idc-range w-full ${className}`}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--fill": `${pct}%` } as React.CSSProperties}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        aria-label={label}
        {...rest}
      />
    </div>
  );
}
