import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAssets } from '../hooks/useAssets';
import { useMusic } from '../hooks/useMusic';
import { themeManifesto, THEME_NAMES, type ThemeType } from '../utils/themeManifesto';
import { GAME_REGISTRY } from '../config/games';
import { ThemedCard } from './Themed/ThemedCard';

function isThemeType(s: string | undefined): s is ThemeType {
  return !!s && (THEME_NAMES as string[]).includes(s);
}

export function WorldPage() {
  const { theme: themeParam } = useParams<{ theme: string }>();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!isThemeType(themeParam)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-8">
        <h1 className="text-2xl font-bold">Unknown world</h1>
        <p className="opacity-70">No themed world named "{themeParam}".</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20">← Back to lobby</button>
      </div>
    );
  }

  const theme = themeParam;
  const m = themeManifesto[theme];

  // Asset keys for this world: hero bg + 3 game pictograms.
  const assetKeys = useMemo(
    () => [`bg_slots_${theme}`, `roulette_${theme}`, `slots_${theme}`, `bingo_${theme}`],
    [theme]
  );
  const { assets } = useAssets(assetKeys);
  const bgUrl = assets[`bg_slots_${theme}`];

  // Auto-play themed music. Defaults to the slots track for this theme;
  // useMusic exposes the URL via musicUrl.
  const { musicUrl } = useMusic(theme, 'slots');
  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
      audioRef.current.play()?.catch(() => { /* autoplay blocked — user gesture required, OK */ });
    }
  }, [musicUrl]);

  const games = GAME_REGISTRY.filter(g => g.theme === theme);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12" data-testid="world-page">
      <audio ref={audioRef} />

      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-xl mb-8"
        style={{
          aspectRatio: '21 / 9',
          backgroundImage: bgUrl ? `url(${bgUrl})` : 'linear-gradient(180deg, var(--theme-secondary), var(--theme-bg))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)' }} />
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Lobby
        </button>
        <div className="absolute inset-0 flex items-end p-6 z-10">
          <h1
            className={`${m.font} text-white`}
            style={{ fontSize: 'var(--text-display, 2.75rem)', textShadow: '0 4px 12px rgba(0,0,0,0.8)' }}
          >
            {m.displayName}
          </h1>
        </div>
      </div>

      {/* 3 themed game cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {games.map(g => {
          const pictogram = assets[`${g.type}_${theme}`];
          return (
            <ThemedCard
              key={g.id}
              onClick={() => navigate(`/game/${g.id}`)}
              data-testid={`game-${g.id}`}
              style={{ padding: '20px', textAlign: 'center' }}
            >
              <div className="aspect-square w-full mb-3 overflow-hidden rounded-lg bg-black/20">
                {pictogram ? (
                  <img src={pictogram} alt={g.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15))' }} />
                )}
              </div>
              <h3 className={`${m.font} text-white text-xl mb-1`} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{g.name}</h3>
              <p className="text-white/80 text-sm">{g.description}</p>
            </ThemedCard>
          );
        })}
      </div>
    </div>
  );
}
