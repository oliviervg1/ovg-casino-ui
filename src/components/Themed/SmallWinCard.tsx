import type { ThemeType } from '../../utils/themeManifesto';
import { ThemedCelebrationCard } from './ThemedCelebrationCard';

export interface SmallWinCardProps {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function SmallWinCard({ amount, theme, onDismiss }: SmallWinCardProps) {
  return (
    <div
      data-testid="small-win-backdrop"
      aria-hidden="true"
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <ThemedCelebrationCard
        tier="small"
        amount={amount}
        theme={theme}
        containerClass="relative"
        onDismiss={onDismiss}
      />
    </div>
  );
}
