import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { UserProfile } from '../../hooks/useUser';
import { GAME_REGISTRY } from '../../config/games';
import { THEME_NAMES, themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { BalancePill } from './BalancePill';
import { MenuDropdown } from './MenuDropdown';
import { MusicPill } from '../MusicPill';

interface AppHeaderProps {
  profile: UserProfile;
  onLogout: () => void;
}

interface RouteInfo {
  mode: 'lobby' | 'page';
  title: string;
  themeFontClass?: string;
}

function describeRoute(pathname: string): RouteInfo {
  if (pathname === '/') return { mode: 'lobby', title: 'OVG Casino' };

  const gameMatch = pathname.match(/^\/game\/(.+)$/);
  if (gameMatch) {
    const def = GAME_REGISTRY.find(g => g.id === gameMatch[1]);
    if (def) {
      return { mode: 'page', title: def.name, themeFontClass: themeManifesto[def.theme].font };
    }
    return { mode: 'page', title: 'Game' };
  }

  const worldMatch = pathname.match(/^\/world\/(.+)$/);
  if (worldMatch && (THEME_NAMES as string[]).includes(worldMatch[1])) {
    const t = worldMatch[1] as ThemeType;
    return { mode: 'page', title: themeManifesto[t].displayName, themeFontClass: themeManifesto[t].font };
  }

  if (pathname.startsWith('/profile')) return { mode: 'page', title: 'Profile' };
  if (pathname.startsWith('/rules')) return { mode: 'page', title: 'Rules' };
  if (pathname.startsWith('/faq')) return { mode: 'page', title: 'Help' };

  return { mode: 'page', title: '' };
}

export function AppHeader({ profile, onLogout }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const route = describeRoute(location.pathname);

  return (
    <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4 min-w-0">
        {route.mode === 'lobby' ? (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-2xl font-casino tracking-wider hover:opacity-80 transition-opacity"
          >
            🎰 OVG Casino
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label="Back to lobby"
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span
              data-testid="app-header-title"
              className={`text-2xl truncate ${route.themeFontClass ?? 'font-casino'} tracking-wide`}
            >
              {route.title}
            </span>
          </>
        )}
        <BalancePill balance={profile.balance} />
      </div>
      <div className="flex items-center gap-3">
        <MusicPill />
        <MenuDropdown
          onProfile={() => navigate('/profile')}
          onRules={() => navigate('/rules')}
          onHelp={() => navigate('/faq')}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
