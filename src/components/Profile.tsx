import { ArrowLeft, User as UserIcon, LogOut, Wallet, RefreshCw } from 'lucide-react';
import { UserProfile } from '../hooks/useUser';
import { useBatchRegenerate } from '../hooks/useBatchRegenerate';
import { REGEN_ERROR_MESSAGES } from './Lobby/AIPitchStrip';

interface ProfileProps {
  profile: UserProfile;
  onBack: () => void;
  onLogout: () => void;
}

export function Profile({ profile, onBack, onLogout }: ProfileProps) {
  const { start: handleRegenerateAssets, isRegenerating, status: regenStatus, error: regenError } = useBatchRegenerate();

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

        <div className="max-w-md mx-auto mb-10">
          <div className="bg-theme-bg p-6 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="p-4 bg-green-500/20 rounded-xl text-green-400">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm opacity-70 uppercase tracking-wider font-bold mb-1">Current Balance</p>
              <p className="text-3xl font-mono font-bold text-green-400">${profile.balance.toLocaleString()}</p>
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
            {regenError && (
              <p className={`text-sm ${regenError === 'quota' ? 'text-red-400' : 'text-yellow-400'}`}>
                {REGEN_ERROR_MESSAGES[regenError]}
              </p>
            )}
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
