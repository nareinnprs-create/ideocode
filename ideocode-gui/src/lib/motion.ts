import type { Variants, Transition } from "framer-motion";

// ── Shared Easing Curves ──
export const ease = {
  spring: [0.16, 1, 0.3, 1] as const,
  springBouncy: [0.34, 1.56, 0.64, 1] as const,
  out: [0.16, 1, 0.3, 1] as const,
  in: [0.4, 0, 1, 1] as const,
  inOut: [0.4, 0, 0.2, 1] as const,
} as const;

// ── Shared Transitions ──
export const transitions = {
  spring: { type: "spring", stiffness: 300, damping: 30 } as Transition,
  springBouncy: { type: "spring", stiffness: 400, damping: 25 } as Transition,
  gentle: { type: "spring", stiffness: 200, damping: 25 } as Transition,
  fast: { duration: 0.15, ease: ease.out } as Transition,
  normal: { duration: 0.25, ease: ease.out } as Transition,
  slow: { duration: 0.4, ease: ease.out } as Transition,
} as const;

// ── Fade Variants ──
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// ── Slide Variants ──
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 16 },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

// ── Scale Variants ──
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const popInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

// ── Container Variants (stagger children) ──
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

// ── Page Transition Variants ──
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

// ── Panel Slide Variants ──
export const panelSlideRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
};

export const panelSlideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 24 },
};

// ── Hover/Tap Interaction Helpers ──
export const hoverScale = {
  scale: 1.02,
  transition: transitions.fast,
};

export const tapScale = {
  scale: 0.98,
};

export const hoverLift = {
  y: -2,
  transition: transitions.fast,
};

// ── Layout Animation Config ──
export const layoutTransition = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
};
