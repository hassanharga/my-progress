'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { getRevealMotion, getStaggerMotion, useReducedMotion } from '@/hooks/use-reduced-motion';

type Props = {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
};

export const StaggerList = ({ children, staggerDelay = 0.05, className }: Props) => {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={{ visible: { transition: getStaggerMotion(reducedMotion, staggerDelay) } }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => {
  const reducedMotion = useReducedMotion();
  const revealMotion = getRevealMotion(reducedMotion);

  return (
    <motion.div
      className={className}
      variants={reducedMotion ? undefined : {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={revealMotion.transition}
    >
      {children}
    </motion.div>
  );
};
