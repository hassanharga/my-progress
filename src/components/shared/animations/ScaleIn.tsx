'use client';

import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

import { getScaleMotion, useReducedMotion } from '@/hooks/use-reduced-motion';

type Props = HTMLMotionProps<'div'> & {
  children: ReactNode;
  delay?: number;
};

export const ScaleIn = ({ children, delay = 0, ...props }: Props) => {
  const motionPreference = getScaleMotion(useReducedMotion(), delay);

  return (
    <motion.div
      initial={motionPreference.initial}
      animate={{ opacity: 1, scale: 1 }}
      transition={motionPreference.transition}
      {...props}
    >
      {children}
    </motion.div>
  );
};
