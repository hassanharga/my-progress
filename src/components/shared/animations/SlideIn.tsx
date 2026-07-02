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
  left: { x: -40 },
  right: { x: 40 },
  up: { y: -40 },
  down: { y: 40 },
};

export const SlideIn = ({ children, direction = 'up', delay = 0, ...props }: Props) => (
  <motion.div
    initial={{ opacity: 0, ...directionVariants[direction] }}
    animate={{ opacity: 1, x: 0, y: 0 }}
    transition={{ delay, duration: 0.2, ease: [0.4, 1, 0.6, 1] }}
    {...props}
  >
    {children}
  </motion.div>
);
