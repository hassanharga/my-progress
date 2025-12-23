'use client';

import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type Props = HTMLMotionProps<'div'> & {
  children: ReactNode;
  delay?: number;
};

export const ScaleIn = ({ children, delay = 0, ...props }: Props) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
    {...props}
  >
    {children}
  </motion.div>
);
