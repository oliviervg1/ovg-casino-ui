import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';

type GameType = 'roulette' | 'slots' | 'bingo';

const GAME_ICONS: Record<GameType, string> = {
  roulette: '🎡',
  slots: '🎰',
  bingo: '🎟',
};

interface WorldCardProps {
  theme: ThemeType;
  bgImageUrl: string;
  /** Receives the gameId in the form `<gameType>-<theme>` (e.g. 'slots-sweets'). */
  onSelectGame: (gameId: string) => void;
  'data-testid'?: string;
}

export function WorldCard({ theme, bgImageUrl, onSelectGame, 'data-testid': testId }: WorldCardProps) {
  const m = themeManifesto[theme];
  const gameTypes: GameType[] = ['roulette', 'slots', 'bingo'];

  const handleCardClick = () => onSelectGame(`slots-${theme}`);
  const handleIconClick = (gt: GameType) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectGame(`${gt}-${theme}`);
  };

  return (
    <div
      data-testid={testId}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      className="relative overflow-hidden cursor-pointer flex flex-col justify-end p-3"
      style={{
        aspectRatio: '3 / 4',
        backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'linear-gradient(180deg, var(--theme-secondary), var(--theme-bg))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {/* Vignette overlay for legibility */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />

      <div className="relative z-10 flex justify-between items-end">
        <span
          className={`${m.font} text-white text-2xl`}
          style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
        >
          {m.displayName}
        </span>
        <div className="flex gap-1">
          {gameTypes.map(gt => (
            <button
              key={gt}
              aria-label={gt}
              onClick={handleIconClick(gt)}
              className="w-8 h-8 rounded flex items-center justify-center text-base bg-white/20 hover:bg-white/30 backdrop-blur-sm border-none cursor-pointer transition-colors"
            >
              {GAME_ICONS[gt]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
