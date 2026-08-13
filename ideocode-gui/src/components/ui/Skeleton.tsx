interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
}

export function Skeleton({ className = "", lines = 1, height = "h-3" }: SkeletonProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded bg-bg-elevated ${height} ${
            i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"
          }`}
        >
          <span className="absolute inset-0 shimmer" />
        </div>
      ))}
    </div>
  );
}
