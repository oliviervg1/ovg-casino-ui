import { useMemo } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { THEME_NAMES, type ThemeType } from '../../utils/themeManifesto';
import { WorldCard } from './WorldCard';

interface LobbyGridProps {
  onSelectGame: (gameId: string) => void;
}

export function LobbyGrid({ onSelectGame }: LobbyGridProps) {
  const assetKeys = useMemo(() => THEME_NAMES.map(t => `bg_slots_${t}`), []);
  const { assets, loading } = useAssets(assetKeys);

  if (loading) {
    return (
      <>
        <style>{`@keyframes themed-skeleton-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto px-2">
          {THEME_NAMES.map((t: ThemeType) => (
            <SkeletonForTheme key={t} theme={t} />
          ))}
        </div>
      </>
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

// `ThemedSkeleton` reads the document-level data-theme attribute. For
// per-card distinct skeletons in the lobby we'd need a per-card theme
// scope, which `useTheme` doesn't currently support. Plan 1 ships a
// theme-neutral shimmer here — fidelity polish (per-card themed
// shimmers) lands as a follow-up after Plan 2 introduces per-element
// theme scoping (or by passing a `theme` prop into `ThemedSkeleton`).
function SkeletonForTheme({ theme: _theme }: { theme: ThemeType }) {
  return (
    <div
      data-skeleton-variant="neutral"
      style={{
        aspectRatio: '3 / 4',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
        backgroundSize: '200% 100%',
        animation: 'themed-skeleton-shimmer 1.5s linear infinite',
        borderRadius: '12px',
      }}
    />
  );
}
