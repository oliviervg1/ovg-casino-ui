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
import { User as UserIcon, HelpCircle, BookOpen } from 'lucide-react';
import { getGameById } from './config/games';
import { resolveGlobalTheme, lightThemes } from './utils/themeStyles';

export type ThemeType = 'sweets' | 'egypt' | 'space' | 'west' | 'ocean' | 'jungle' | 'vampire' | 'ninja';
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

  const userTheme = resolveGlobalTheme(profile?.theme);
  let currentTheme = userTheme;
  if (location.pathname.startsWith('/game/')) {
    const gameId = location.pathname.split('/game/')[1];
    const gameDef = getGameById(gameId);
    if (gameDef) {
      currentTheme = lightThemes.includes(gameDef.theme) ? 'light' : 'dark';
    }
  }
  
  const bgKey = 'bg_main';
  
  const { assets, loading: bgLoading, progress: bgProgress } = useAssets([bgKey]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

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
    <div className="h-screen flex flex-col transition-colors duration-500 overflow-hidden">
      {bgLoading && (
        <div className="fixed inset-0 z-0 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none transition-opacity duration-500">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-white/80 text-sm animate-pulse mb-2 text-center">Generating unique game assets using Google Cloud AI</p>
            <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300 ease-out"
                style={{ width: `${bgProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      <header className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 
            className="text-2xl font-casino tracking-wider cursor-pointer" 
            onClick={() => navigate('/')}
          >
            OVG Casino
          </h1>
          <div className="px-4 py-1 rounded-full bg-black/30 font-mono font-bold text-lg text-green-400">
            ${profile.balance.toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/rules')} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Game Rules"
          >
            <BookOpen className="w-5 h-5 opacity-70" />
            <span className="text-sm font-medium opacity-90 hidden sm:block">Rules</span>
          </button>
          <button 
            onClick={() => navigate('/faq')} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Help & FAQ"
          >
            <HelpCircle className="w-5 h-5 opacity-70" />
            <span className="text-sm font-medium opacity-90 hidden sm:block">Help</span>
          </button>
          <button 
            onClick={() => navigate('/profile')} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-5 h-5 opacity-70" />
            )}
            <span className="text-sm font-medium opacity-90 hidden sm:block">{profile.displayName}</span>
          </button>
        </div>
      </header>

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
            <Route path="/game/:gameId" element={
              <motion.div className="flex-1 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <GameRouteWrapper />
              </motion.div>
            } />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
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
