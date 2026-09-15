'use client';

import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type MatchMedia = (query: string) => MediaQueryList;

export const getRevealMotion = (reducedMotion: boolean, index = 0) =>
  reducedMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        transition: { delay: index * 0.05, duration: 0.15, ease: [0.4, 1, 0.6, 1] as const },
      };

export const getScaleMotion = (reducedMotion: boolean, delay = 0) =>
  reducedMotion
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.9 },
        transition: { delay, type: 'spring' as const, stiffness: 300, damping: 24 },
      };

export const getStaggerMotion = (reducedMotion: boolean, staggerDelay: number) => ({
  staggerChildren: reducedMotion ? 0 : staggerDelay,
});

export const subscribeToReducedMotion = (
  matchMedia: MatchMedia,
  onChange: (matches: boolean) => void
): (() => void) => {
  const query = matchMedia(REDUCED_MOTION_QUERY);
  const handleChange = (event: MediaQueryListEvent) => onChange(event.matches);

  onChange(query.matches);
  query.addEventListener('change', handleChange);

  return () => query.removeEventListener('change', handleChange);
};

export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => subscribeToReducedMotion(window.matchMedia.bind(window), setReducedMotion), []);

  return reducedMotion;
};
