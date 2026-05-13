import { motion } from 'motion/react';
import { LogIn, AlertCircle } from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
  isLoggingIn?: boolean;
  loginError?: string | null;
}

export function Auth({ onLogin, isLoggingIn, loginError }: AuthProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎰</span>
        </div>
        <h1 className="text-4xl font-casino tracking-wider mb-2">OVG Casino</h1>
        <p className="text-zinc-400 mb-8">Sign in to start playing with your $1,000 starting balance.</p>
        
        {loginError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{loginError}</p>
          </div>
        )}

        <button 
          onClick={onLogin}
          disabled={isLoggingIn}
          className="w-full bg-white text-black rounded-xl py-4 font-semibold flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? (
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          {isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </motion.div>
    </div>
  );
}
