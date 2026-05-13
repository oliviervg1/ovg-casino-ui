import type { ThemeType } from '../../utils/themeManifesto';
import { ThemedCelebrationCard } from './ThemedCelebrationCard';

export interface JackpotOverlayProps {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function JackpotOverlay({ amount, theme, onDismiss }: JackpotOverlayProps) {
  return (
    <div
      data-testid="jackpot-backdrop"
      aria-hidden="true"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, var(--theme-accent) 0%, transparent 60%)`,
          opacity: 0.4,
        }}
      />
      <ThemedCelebrationCard
        tier="jackpot"
        amount={amount}
        theme={theme}
        containerClass="relative z-10"
        onDismiss={onDismiss}
      />
    </div>
  );
}
