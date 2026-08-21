import { motion, type MotionProps } from "framer-motion";
import { fadeVariants, transitions } from "../../lib/motion";

interface FadeInProps extends MotionProps {
  children: React.ReactNode;
  delay?: number;
}

export function FadeIn({ children, delay = 0, ...props }: FadeInProps) {
  return (
    <motion.div
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      transition={{ ...transitions.normal, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
