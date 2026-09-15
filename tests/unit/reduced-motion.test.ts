import {
  getRevealMotion,
  getScaleMotion,
  getStaggerMotion,
  subscribeToReducedMotion,
} from '@/hooks/use-reduced-motion';

describe('subscribeToReducedMotion', () => {
  it('reports the initial preference and later changes', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const query = {
      matches: true,
      addEventListener: (_: 'change', listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_: 'change', listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    } as unknown as MediaQueryList;
    const values: boolean[] = [];

    const unsubscribe = subscribeToReducedMotion(() => query, (value) => values.push(value));
    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    unsubscribe();

    expect(values).toEqual([true, false]);
    expect(listeners.size).toBe(0);
  });
});

describe('getRevealMotion', () => {
  it('removes travel and delay when reduced motion is requested', () => {
    expect(getRevealMotion(true, 6)).toEqual({
      initial: false,
      transition: { duration: 0 },
    });
  });

  it('keeps short ordered disclosure when motion is allowed', () => {
    expect(getRevealMotion(false, 2)).toEqual({
      initial: { opacity: 0, y: 8 },
      transition: { delay: 0.1, duration: 0.15, ease: [0.4, 1, 0.6, 1] },
    });
  });
});

describe('shared motion contracts', () => {
  it('removes scale and delay when reduced motion is requested', () => {
    expect(getScaleMotion(true, 4)).toEqual({
      initial: false,
      transition: { duration: 0 },
    });
  });

  it('removes list staggering when reduced motion is requested', () => {
    expect(getStaggerMotion(true, 0.1)).toEqual({ staggerChildren: 0 });
    expect(getStaggerMotion(false, 0.1)).toEqual({ staggerChildren: 0.1 });
  });
});
