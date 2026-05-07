import { useEffect, useState } from 'react';

const DURATIONS = {
  instant: 100,
  quick: 250,
  standard: 400,
  slow: 1200,
  spin: 2500,
} as const;

interface MotionApi {
  shouldAnimate: boolean;
  durations: typeof DURATIONS;
  /**
   * Pick between two variants based on the user's reduced-motion preference.
   * Useful for Framer Motion `animate` props or any branched motion config.
   */
  motionVariant: <T>(full: T, reduced: T) => T;
}

/**
 * Centralised reduced-motion handling. Components that animate should read
 * `shouldAnimate` (or call `motionVariant`) instead of using Framer Motion
 * defaults directly, so the OS preference is respected uniformly.
 */
export function useMotion(): MotionApi {
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setShouldAnimate(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return {
    shouldAnimate,
    durations: DURATIONS,
    motionVariant: <T,>(full: T, reduced: T) => (shouldAnimate ? full : reduced),
  };
}
