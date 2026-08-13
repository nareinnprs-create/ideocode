export type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-5 h-5 text-[8px]",
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #8b5cf6)",
  "linear-gradient(135deg, #22d3ee, #6366f1)",
  "linear-gradient(135deg, #34d399, #22d3ee)",
  "linear-gradient(135deg, #8b5cf6, #d946ef)",
  "linear-gradient(135deg, #fbbf24, #f87171)",
  "linear-gradient(135deg, #22d3ee, #34d399)",
];

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  const gradient = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white select-none shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      style={{ background: gradient }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
