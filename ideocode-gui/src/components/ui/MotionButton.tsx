import { motion, type MotionProps } from "framer-motion";
import { hoverScale, tapScale, transitions } from "../../lib/motion";

interface MotionButtonProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function MotionButton({
  children,
  className = "",
  onClick,
  disabled = false,
  ...props
}: MotionButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : hoverScale}
      whileTap={disabled ? undefined : tapScale}
      transition={transitions.fast}
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
