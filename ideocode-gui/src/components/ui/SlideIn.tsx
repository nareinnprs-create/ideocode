import { motion, type MotionProps } from "framer-motion";
import { slideUpVariants, slideLeftVariants, slideRightVariants, transitions } from "../../lib/motion";

interface SlideInProps extends MotionProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
}

const DIRECTION_VARIANTS = {
  up: slideUpVariants,
  down: slideUpVariants,
  left: slideLeftVariants,
  right: slideRightVariants,
} as const;

export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  ...props
}: SlideInProps) {
  return (
    <motion.div
      variants={DIRECTION_VARIANTS[direction]}
      initial="hidden"
      animate="visible"
      transition={{ ...transitions.gentle, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
