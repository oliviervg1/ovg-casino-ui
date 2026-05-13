import { AIPitchStrip } from './Lobby/AIPitchStrip';
import { LobbyGrid } from './Lobby/LobbyGrid';
import { useBatchRegenerate } from '../hooks/useBatchRegenerate';
import { useNavigate } from 'react-router-dom';
import type { ThemeType } from '../utils/themeManifesto';

interface LobbyProps {
  /** Game id from GAME_REGISTRY (e.g. 'sugar-spin', 'candy-crushers'). */
  onSelectGame: (gameId: string) => void;
}

export function Lobby({ onSelectGame }: LobbyProps) {
  const { start: handleRegenerate, isRegenerating, status: regenStatus, error: regenError } = useBatchRegenerate();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-7xl mx-auto mt-6 px-4">
      <AIPitchStrip
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        status={regenStatus}
        error={regenError}
      />
      <LobbyGrid
        onSelectGame={onSelectGame}
        onSelectWorld={(theme: ThemeType) => navigate(`/world/${theme}`)}
      />
    </div>
  );
}
