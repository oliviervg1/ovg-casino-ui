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
      className="absolute inset-0 z-30 bg-black/30 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div
        data-testid="small-win-positioner"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[80vw]"
      >
        <ThemedCelebrationCard
          tier="small"
          amount={amount}
          theme={theme}
          containerClass="relative"
          onDismiss={onDismiss}
        />
      </div>
    </div>
  );
}
