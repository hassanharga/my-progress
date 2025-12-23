'use client';

import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type Direction = 'left' | 'right' | 'up' | 'down';

type Props = HTMLMotionProps<'div'> & {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
};

const directionVariants = {
  left: { x: -100 },
  right: { x: 100 },
  up: { y: -100 },
  down: { y: 100 },
};

export const SlideIn = ({ children, direction = 'up', delay = 0, ...props }: Props) => (
  <motion.div
    initial={{ opacity: 0, ...directionVariants[direction] }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 300, damping: 30 }}
    {...props}
  >
    {children}
  </motion.div>
);
