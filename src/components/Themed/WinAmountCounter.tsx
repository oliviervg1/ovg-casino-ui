import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../hooks/useMotion';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  amount: number;
  tier: 'jackpot' | 'small';
  theme: ThemeType;
}

function format(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function WinAmountCounter({ amount, tier, theme }: Props) {
  const motion = useMotion();
  const durationMs = tier === 'jackpot' ? 1200 : 600;
  const [displayed, setDisplayed] = useState<number>(motion.shouldAnimate ? 0 : amount);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!motion.shouldAnimate || startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(amount * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplayed(amount);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [amount, durationMs, motion.shouldAnimate]);

  return (
    <span aria-hidden="true" className="text-theme-accent font-bold tabular-nums text-[4vh]">
      {format(displayed)}
    </span>
  );
}
