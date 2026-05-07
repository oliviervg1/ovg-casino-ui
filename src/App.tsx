/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useUser } from './hooks/useUser';
import { Auth } from './components/Auth';
import { Lobby } from './components/Lobby';
import { Profile } from './components/Profile';
import { FAQ } from './components/FAQ';
import { Rules } from './components/Rules';
import { Roulette } from './components/Games/Roulette';
import { Slots } from './components/Games/Slots';
import { Bingo } from './components/Games/Bingo';
import { motion, AnimatePresence } from 'motion/react';
import { useAssets } from './hooks/useAssets';
import { getGameById, GAME_REGISTRY } from './config/games';
import { THEME_NAMES, type ThemeType } from './utils/themeManifesto';
import { WorldPage } from './components/WorldPage';
import { AppHeader } from './components/Layout/AppHeader';
import { AudioControlsProvider } from './contexts/AudioControlsContext';

export type { ThemeType } from './utils/themeManifesto';
export type GameType = string;

function GameRouteWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { profile, updateBalance } = useUser();

  if (!profile || !gameId) return null;

  const gameDef = getGameById(gameId);
  if (!gameDef) {
    return <div>Game not found</div>;
  }

  const { type, theme, name } = gameDef;

  if (type === 'roulette') {
    return <Roulette name={name} theme={theme} balance={profile.balance} onUpdateBalance={updateBalance} onBack={() => navigate('/')} />;
  }
  if (type === 'slots') {
    return <Slots name={name} theme={theme} balance={profile.balance} onUpdateBalance={updateBalance} onBack={() => navigate('/')} />;
  }
  if (type === 'bingo') {
    return <Bingo name={name} theme={theme} balance={profile.balance} onUpdateBalance={updateBalance} onBack={() => navigate('/')} />;
  }

  return <div>Game not found</div>;
}

function AppContent() {
  const { user, profile, loading, isLoggingIn, loginError, login, logout, updateTheme } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(has);
      }
    };
    checkKey();
  }, []);

  // The body theme tracks the current game's theme on game pages, so the
  // per-theme CSS custom properties (sweets / egypt / space / …) apply.
  // On non-game routes (lobby, profile, etc.) we fall back to a neutral
  // default so the page chrome still has theme tokens to read.
  let currentTheme: ThemeType = 'sweets';
  const gameMatch = location.pathname.match(/^\/game\/(.+)$/);
  const worldMatch = location.pathname.match(/^\/world\/(.+)$/);
  if (gameMatch) {
    const gameDef = GAME_REGISTRY.find(g => g.id === gameMatch[1]);
    if (gameDef) currentTheme = gameDef.theme;
  } else if (worldMatch && (THEME_NAMES as string[]).includes(worldMatch[1])) {
    currentTheme = worldMatch[1] as ThemeType;
  }
  
  const bgKey = 'bg_main';

  // Wait for Firebase auth to resolve before requesting bg_main; AssetManager
  // throws "not_authenticated" if auth.currentUser is null when getAsset runs,
  // and the effect's only other dep (memoKeys) doesn't change with auth state,
  // so without this gate the failed initial fetch would never retry.
  const { assets, loading: bgLoading } = useAssets([bgKey], { enabled: !!user });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    let route: 'lobby' | 'world' | 'game' | 'other' = 'other';
    if (location.pathname === '/') route = 'lobby';
    else if (location.pathname.startsWith('/world/')) route = 'world';
    else if (location.pathname.startsWith('/game/')) route = 'game';
    document.documentElement.setAttribute('data-route', route);
  }, [location.pathname]);

  // Sync user profile name with CES Messenger
  useEffect(() => {
    const cesm = document.querySelector('ces-messenger') as any;
    if (!cesm || !profile?.displayName) return;

    const firstName = profile.displayName.split(' ')[0];
    
    const updateParams = () => {
      try {
        if (typeof cesm.setQueryParameters === 'function') {
          cesm.setQueryParameters({ user_first_name: firstName });
        }
      } catch (err) {
        console.error("Failed to set query parameters", err);
      }
    };

    // Update immediately if possible
    if ('setQueryParameters' in cesm && typeof cesm.setQueryParameters === 'function') {
      updateParams();
    } else {
      cesm.addEventListener('ces-messenger-loaded', updateParams, { once: false });
    }

    const onChatOpenChanged = (event: any) => {
      if (event.detail?.isOpen) {
        updateParams();
      }
    };

    cesm.addEventListener('ces-chat-open-changed', onChatOpenChanged);

    return () => {
      cesm.removeEventListener('ces-messenger-loaded', updateParams);
      cesm.removeEventListener('ces-chat-open-changed', onChatOpenChanged);
    };
  }, [profile?.displayName]);

  useEffect(() => {
    if (assets[bgKey]) {
      document.documentElement.style.setProperty('--bg-image', `url(${assets[bgKey]})`);
    }
  }, [assets, bgKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-4 p-8 text-center">
        <h1 className="text-3xl font-bold">API Key Required</h1>
        <p className="max-w-md opacity-80">This app uses Lyria 3 Pro to generate music, which requires a paid Gemini API key.</p>
        <button 
          onClick={async () => {
            if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
              await (window as any).aistudio.openSelectKey();
              setHasKey(true);
            }
          }}
          className="px-6 py-3 bg-theme-primary rounded-full hover:opacity-90 transition-opacity font-bold mt-4"
        >
          Select API Key
        </button>
      </div>
    );
  }

  if (!user || !profile) {
    return <Auth onLogin={login} isLoggingIn={isLoggingIn} loginError={loginError} />;
  }

  return (
    <AudioControlsProvider>
      <div className="h-screen flex flex-col transition-colors duration-500 overflow-hidden">
        {bgLoading && (
        <div className="fixed inset-0 z-0 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none transition-opacity duration-500">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-white/80 text-sm animate-pulse mb-2 text-center">Generating unique game assets using Google Cloud AI</p>
          </div>
        </div>
      )}
      <AppHeader profile={profile} onLogout={logout} />

      <main className="w-full mx-auto p-4 md:p-8 relative z-10 flex-1 flex flex-col overflow-y-auto">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <Lobby onSelectGame={(game) => navigate(`/game/${game}`)} />
              </motion.div>
            } />
            <Route path="/profile" element={
              <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <Profile profile={profile} onBack={() => navigate('/')} onLogout={logout} onUpdateTheme={updateTheme} />
              </motion.div>
            } />
            <Route path="/faq/:categoryId?" element={
              <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <FAQ onBack={() => navigate('/')} />
              </motion.div>
            } />
            <Route path="/rules/:gameId?" element={
              <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <Rules onBack={() => navigate('/')} />
              </motion.div>
            } />
            <Route path="/world/:theme" element={
              <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <WorldPage />
              </motion.div>
            } />
            <Route path="/game/:gameId" element={
              <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <GameRouteWrapper />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
        </main>
      </div>
    </AudioControlsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </BrowserRouter>
  );
}
