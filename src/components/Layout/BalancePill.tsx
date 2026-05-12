import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../hooks/useMotion';
import { useCelebration } from '../../contexts/CelebrationContext';

interface BalancePillProps {
  balance: number;
}

function format(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export function BalancePill({ balance }: BalancePillProps) {
  const motion = useMotion();
  const { pendingTick } = useCelebration();
  const [displayed, setDisplayed] = useState<number>(balance);
  const previousRef = useRef<number>(balance);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = balance;
    if (balance <= previous || !motion.shouldAnimate) {
      setDisplayed(balance);
      return;
    }
    const start = performance.now();
    const duration = pendingTick?.durationMs ?? motion.durations.slow;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(previous + (balance - previous) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplayed(balance);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [balance, motion.shouldAnimate, motion.durations.slow, pendingTick?.durationMs]);

  return (
    <div
      data-testid="balance-pill"
      className="px-4 py-1 rounded-full bg-black/30 font-mono font-bold text-lg text-green-400"
    >
      <span data-testid="balance-display">{format(displayed)}</span>
      <span data-testid="balance-aria-live" aria-live="polite" className="sr-only">
        {format(balance)}
      </span>
    </div>
  );
}
