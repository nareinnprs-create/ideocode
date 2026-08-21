import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 16, className = "", label = "Loading" }: SpinnerProps) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`} role="status" aria-label={label}>
      <Loader2 size={size} className="animate-spin text-accent" />
    </span>
  );
}
