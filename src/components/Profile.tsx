import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User as UserIcon, LogOut, Wallet, Palette, RefreshCw } from 'lucide-react';
import { UserProfile } from '../hooks/useUser';
import { regenerateAsset, RegenQuotaExceededError } from '../lib/AssetManager';
import { regenerateMusic } from '../lib/MusicManager';

interface ProfileProps {
  profile: UserProfile;
  onBack: () => void;
  onLogout: () => void;
  onUpdateTheme: (theme: 'light' | 'dark') => void;
}

export function Profile({ profile, onBack, onLogout, onUpdateTheme }: ProfileProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenStatus, setRegenStatus] = useState<string | null>(null);

  const ASSET_KEYS = [
    'sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja',
  ].flatMap(theme => [
    `roulette_${theme}`, `slots_${theme}`, `bingo_${theme}`,
    `${theme}_1`, `${theme}_2`, `${theme}_3`, `${theme}_4`,
    `bg_roulette_${theme}`, `bg_slots_${theme}`, `bg_bingo_${theme}`,
  ]).concat(['bg_main']);

  const MUSIC_PAIRS: Array<[string, string]> = [
    'sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja',
  ].flatMap(theme => (['roulette', 'slots', 'bingo'] as const).map(gt => [theme, gt] as [string, string]));

  const handleRegenerateAssets = async () => {
    setIsRegenerating(true);
    setRegenStatus(null);
    let done = 0;
    const total = ASSET_KEYS.length + MUSIC_PAIRS.length;
    let quotaHit = false;
    const update = () => setRegenStatus(`Regenerating ${++done}/${total}…`);

    const tasks = [
      ...ASSET_KEYS.map(k => () => regenerateAsset(k).then(update)),
      ...MUSIC_PAIRS.map(([t, gt]) => () => regenerateMusic(t, gt).then(update)),
    ];

    const results = await Promise.allSettled(tasks.map(fn => fn().catch((err) => {
      if (err instanceof RegenQuotaExceededError) quotaHit = true;
      throw err;
    })));

    const failures = results.filter(r => r.status === 'rejected').length;
    if (quotaHit) {
      setRegenStatus("You've hit today's regenerate limit — try again tomorrow.");
    } else if (failures > 0) {
      setRegenStatus(`Regenerated ${total - failures}/${total}. ${failures} failed.`);
    } else {
      setRegenStatus(`All ${total} assets regenerated. Reload the page to see them.`);
    }
    setIsRegenerating(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 mb-8 opacity-70 hover:opacity-100 transition-opacity">
        <ArrowLeft className="w-5 h-5" /> Back to Lobby
      </button>

      <div className="bg-theme-card backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-theme-primary mb-6 shadow-xl bg-theme-bg flex items-center justify-center">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-16 h-16 opacity-50" />
            )}
          </div>
          <h2 className="text-4xl font-casino tracking-wider mb-2">{profile.displayName}</h2>
          <p className="opacity-70 text-lg">{profile.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-theme-bg p-6 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="p-4 bg-green-500/20 rounded-xl text-green-400">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-70 uppercase tracking-wider font-bold mb-1">Current Balance</p>
              <p className="text-3xl font-mono font-bold text-green-400">${profile.balance.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-theme-bg p-6 rounded-2xl border border-white/10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-5 h-5 opacity-70" />
              <p className="text-sm opacity-70 uppercase tracking-wider font-bold">Preferred Theme</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onUpdateTheme('light')}
                className={`flex-1 py-2 rounded-lg font-bold tracking-wider text-xl transition-all ${profile.theme === 'light' || (profile.theme as any) === 'sweets' ? 'bg-pink-500 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
              >
                Light
              </button>
              <button 
                onClick={() => onUpdateTheme('dark')}
                className={`flex-1 py-2 rounded-lg font-bold tracking-wider text-xl transition-all ${profile.theme === 'dark' || (profile.theme as any) === 'egypt' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleRegenerateAssets}
              disabled={isRegenerating}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? (regenStatus ?? 'REGENERATING…') : 'REGENERATE ASSETS'}
            </button>
            {!isRegenerating && regenStatus && <p className="text-sm opacity-80">{regenStatus}</p>}
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors font-bold tracking-wider"
          >
            <LogOut className="w-5 h-5" />
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  );
}
