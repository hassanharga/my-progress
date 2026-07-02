'use client';

import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type Props = HTMLMotionProps<'div'> & {
  children: ReactNode;
  delay?: number;
  duration?: number;
};

export const FadeIn = ({ children, delay = 0, duration = 0.15, ...props }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration, ease: [0.4, 1, 0.6, 1] }}
    {...props}
  >
    {children}
  </motion.div>
);
