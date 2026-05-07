import { GameType } from '../App';
import { AIPitchStrip } from './Lobby/AIPitchStrip';
import { LobbyGrid } from './Lobby/LobbyGrid';
import { useBatchRegenerate } from '../hooks/useBatchRegenerate';

interface LobbyProps {
  onSelectGame: (game: GameType) => void;
}

export function Lobby({ onSelectGame }: LobbyProps) {
  const { start: handleRegenerate, isRegenerating, status: regenStatus } = useBatchRegenerate();

  return (
    <div className="w-full max-w-7xl mx-auto mt-6 px-4">
      <AIPitchStrip
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        status={regenStatus}
      />
      <LobbyGrid onSelectGame={(gameId) => onSelectGame(gameId as GameType)} />
    </div>
  );
}
