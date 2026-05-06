import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { GameType } from '../App';
import { useAssets } from '../hooks/useAssets';
import { getThemeStyles } from '../utils/themeStyles';
import { GAME_REGISTRY } from '../config/games';

interface LobbyProps {
  onSelectGame: (game: GameType) => void;
}

export function Lobby({ onSelectGame }: LobbyProps) {
  const themes = useMemo(() => [
    { id: 'sweets', name: 'Sweets', color: 'bg-pink-500', fallback: ['🍭', '🧁', '🍬'] },
    { id: 'egypt', name: 'Egypt', color: 'bg-yellow-600', fallback: ['🏺', '🛕', '📜'] },
    { id: 'space', name: 'Space', color: 'bg-indigo-900', fallback: ['🚀', '👽', '🪐'] },
    { id: 'west', name: 'Wild West', color: 'bg-orange-800', fallback: ['🤠', '🌵', '🐎'] },
    { id: 'ocean', name: 'Ocean', color: 'bg-blue-800', fallback: ['🦈', '🐙', '🐚'] },
    { id: 'jungle', name: 'Jungle', color: 'bg-green-800', fallback: ['🐒', '🐍', '🗿'] },
    { id: 'vampire', name: 'Vampire', color: 'bg-purple-900', fallback: ['🦇', '🧛', '🩸'] },
    { id: 'ninja', name: 'Ninja', color: 'bg-slate-800', fallback: ['🥷', '🗡️', '🌸'] },
  ], []);

  const assetKeys = useMemo(() => {
    const keys: string[] = [];
    themes.forEach(t => {
      keys.push(`roulette_${t.id}`, `slots_${t.id}`, `bingo_${t.id}`);
    });
    return keys;
  }, [themes]);
  const { assets, loading } = useAssets(assetKeys);

  const games = useMemo(() => themes.flatMap(theme => {
    const rouletteDef = GAME_REGISTRY.find(g => g.type === 'roulette' && g.theme === theme.id);
    const slotsDef = GAME_REGISTRY.find(g => g.type === 'slots' && g.theme === theme.id);
    const bingoDef = GAME_REGISTRY.find(g => g.type === 'bingo' && g.theme === theme.id);

    return [
      {
        id: rouletteDef?.id || `roulette-${theme.id}` as GameType,
        name: rouletteDef?.name || `${theme.name} Roulette`,
        icon: assets[`roulette_${theme.id}`],
        fallback: theme.fallback[0],
        description: rouletteDef?.description || `Spin the ${theme.name.toLowerCase()} wheel!`,
        color: theme.color,
        type: 'roulette',
        theme: theme.id
      },
      {
        id: slotsDef?.id || `slots-${theme.id}` as GameType,
        name: slotsDef?.name || `${theme.name} Slots`,
        icon: assets[`slots_${theme.id}`],
        fallback: theme.fallback[1],
        description: slotsDef?.description || `Match ${theme.name.toLowerCase()} symbols!`,
        color: theme.color,
        type: 'slots',
        theme: theme.id
      },
      {
        id: bingoDef?.id || `bingo-${theme.id}` as GameType,
        name: bingoDef?.name || `${theme.name} Bingo`,
        icon: assets[`bingo_${theme.id}`],
        fallback: theme.fallback[2],
        description: bingoDef?.description || `Play ${theme.name.toLowerCase()} bingo!`,
        color: theme.color,
        type: 'bingo',
        theme: theme.id
      }
    ];
  }), [themes, assets]);

  const [groupBy, setGroupBy] = React.useState<'type' | 'theme'>('type');

  const gameCategories = useMemo(() => {
    if (groupBy === 'type') {
      return [
        {
          title: 'Roulette',
          description: 'Spin the wheel and test your luck',
          games: games.filter(g => g.type === 'roulette')
        },
        {
          title: 'Slots',
          description: 'Match symbols to win big',
          games: games.filter(g => g.type === 'slots')
        },
        {
          title: 'Bingo',
          description: 'Complete lines on your 5x5 card',
          games: games.filter(g => g.type === 'bingo')
        }
      ];
    } else {
      return themes.map(theme => ({
        title: theme.name,
        description: `Explore the ${theme.name} universe`,
        games: games.filter(g => g.theme === theme.id)
      }));
    }
  }, [groupBy, games, themes]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary mb-6"></div>
        <p className="text-xl opacity-80 animate-pulse mb-4 text-center">Generating unique game assets using Google Cloud AI</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto mt-12">
      <div className="text-center mb-16">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-6xl mb-4"
        >
          🎰
        </motion.div>
        <h2 className="text-4xl md:text-5xl font-casino mb-4 tracking-tight">
          Welcome to OVG Casino
        </h2>
        <p className="text-xl opacity-80 max-w-2xl mx-auto mb-8">
          Step into the ultimate virtual casino! Experience thrilling games, massive jackpots, and endless entertainment. Choose your adventure and let the winning begin!
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setGroupBy('type')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${groupBy === 'type' ? 'bg-theme-primary text-white shadow-lg scale-105' : 'bg-white/10 hover:bg-white/20'}`}
          >
            Group by Game Type
          </button>
          <button
            onClick={() => setGroupBy('theme')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${groupBy === 'theme' ? 'bg-theme-primary text-white shadow-lg scale-105' : 'bg-white/10 hover:bg-white/20'}`}
          >
            Group by Theme
          </button>
        </div>
      </div>

      <div className="space-y-16 pb-16">
        {gameCategories.map((category, catIndex) => (
          <div key={category.title} className="relative">
            {catIndex > 0 && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
            <div className="text-center mb-8">
              <h3 className="text-3xl font-casino tracking-wider mb-2">{category.title}</h3>
              <p className="opacity-70">{category.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto px-4">
              {category.games.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectGame(game.id)}
                  className="bg-theme-card backdrop-blur-xl rounded-3xl p-8 md:p-10 cursor-pointer shadow-2xl border border-white/20 flex flex-col items-center text-center group transition-all"
                >
                  <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full ${game.color} flex items-center justify-center text-5xl md:text-6xl mb-6 shadow-lg group-hover:shadow-xl transition-shadow text-white overflow-hidden border-[6px] border-theme-bg`}>
                    {game.icon ? (
                      <img src={game.icon} alt={game.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      game.fallback
                    )}
                  </div>
                  <h3 className={`text-2xl md:text-3xl mb-2 ${getThemeStyles(game.theme).font}`}>{game.name}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
