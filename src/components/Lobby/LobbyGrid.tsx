import { useMemo } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { WorldCard } from './WorldCard';
import { ThemedSkeleton } from '../Themed/ThemedSkeleton';

interface LobbyGridProps {
  onSelectGame: (gameId: string) => void;
}

export function LobbyGrid({ onSelectGame }: LobbyGridProps) {
  const assetKeys = useMemo(() => THEME_NAMES.map(t => `bg_slots_${t}`), []);
  const { assets, loading } = useAssets(assetKeys);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto px-2">
        {THEME_NAMES.map((t: ThemeType) => (
          <ThemedSkeleton key={t} theme={t} aspectRatio="3 / 4" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto px-2">
      {THEME_NAMES.map((t: ThemeType) => (
        <WorldCard
          key={t}
          theme={t}
          bgImageUrl={assets[`bg_slots_${t}`] ?? ''}
          onSelectGame={onSelectGame}
        />
      ))}
    </div>
  );
}
