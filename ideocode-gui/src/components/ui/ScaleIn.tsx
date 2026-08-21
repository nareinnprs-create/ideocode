import { motion, type MotionProps } from "framer-motion";
import { scaleVariants, transitions } from "../../lib/motion";

interface ScaleInProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
}

export function ScaleIn({ children, delay = 0, ...props }: ScaleInProps) {
  return (
    <motion.div
      variants={scaleVariants}
      initial="hidden"
      animate="visible"
      transition={{ ...transitions.spring, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
