import { motion, type MotionProps } from "framer-motion";
import { pageTransition, transitions } from "../../lib/motion";

interface PageTransitionProps extends MotionProps {
  children: React.ReactNode;
}

export function PageTransition({ children, ...props }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transitions.gentle}
      {...props}
    >
      {children}
    </motion.div>
  );
}
