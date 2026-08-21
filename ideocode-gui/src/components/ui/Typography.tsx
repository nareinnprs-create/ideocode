import type { ComponentPropsWithRef, ReactNode } from "react";

interface HeadingProps extends ComponentPropsWithRef<"h2"> {
  level?: 1 | 2 | 3 | 4;
}

const LEVEL_CLASSES: Record<number, string> = {
  1: "text-2xl font-bold",
  2: "text-lg font-semibold",
  3: "text-base font-semibold",
  4: "text-sm font-medium",
};

export function Heading({ level = 2, className = "", ref, ...rest }: HeadingProps) {
  const Tag = (`h${level}`) as "h1" | "h2" | "h3" | "h4";
  return (
    <Tag
      ref={ref}
      className={`${LEVEL_CLASSES[level]} font-sans text-fg-primary ${className}`}
      {...rest}
    />
  );
}

interface TextProps extends ComponentPropsWithRef<"p"> {
  variant?: "primary" | "secondary" | "muted";
  mono?: boolean;
  size?: "xs" | "sm" | "md";
}

const TEXT_VARIANT: Record<NonNullable<TextProps["variant"]>, string> = {
  primary: "text-fg-primary",
  secondary: "text-fg-secondary",
  muted: "text-fg-muted",
};

const TEXT_SIZE: Record<NonNullable<TextProps["size"]>, string> = {
  xs: "text-[11px]",
  sm: "text-xs",
  md: "text-sm",
};

export function Text({ variant = "primary", mono = false, size = "md", className = "", ref, ...rest }: TextProps) {
  return (
    <p
      ref={ref}
      className={`${TEXT_VARIANT[variant]} ${TEXT_SIZE[size]} ${mono ? "font-mono" : ""} ${className}`}
      {...rest}
    />
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] font-medium text-fg-secondary ${className}`}>{children}</span>;
}

export function Caption({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] text-fg-muted ${className}`}>{children}</span>;
}
