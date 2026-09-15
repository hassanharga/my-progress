'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type Props = {
  children: ReactNode;
};

export const PageTransition = ({ children }: Props) => {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.4, 1, 0.6, 1] }}
        className="flex-1 flex"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
