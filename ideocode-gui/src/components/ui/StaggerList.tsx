import { motion, type MotionProps } from "framer-motion";
import { staggerContainer, staggerItem, transitions } from "../../lib/motion";

interface StaggerListProps extends MotionProps {
  children: React.ReactNode;
}

export function StaggerList({ children, ...props }: StaggerListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends MotionProps {
  children: React.ReactNode;
}

export function StaggerItem({ children, ...props }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      transition={transitions.gentle}
      {...props}
    >
      {children}
    </motion.div>
  );
}
