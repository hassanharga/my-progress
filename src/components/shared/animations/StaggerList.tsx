'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Props = {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
};

export const StaggerList = ({ children, staggerDelay = 0.05, className }: Props) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.15, ease: [0.4, 1, 0.6, 1] }}
  >
    {children}
  </motion.div>
);
